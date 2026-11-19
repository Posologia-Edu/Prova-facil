// Reconciliação v2, lado do ALUNO. O aluno se identifica com o PIN da sala e o próprio e-mail.
// Três ações:
//  - "estado": devolve o caso que cabe à dupla (dossiê), a BPMH já enviada e, SÓ se a BPMH já foi enviada, a prescrição.
//  - "enviar_bpmh": grava e TRAVA a BPMH e só então entrega a prescrição. Depois do envio, a BPMH não muda.
//  - "enviar_final": grava a resposta final; os campos das etapas 1 e 2 voltam a ser os da BPMH travada.
//  - "importar_soap": devolve as linhas da farmacoterapia do SOAP v2 do aluno, no formato da BPMH, SÓ se o paciente do SOAP for o do caso.
// Caso da dupla: se há casos derivados de paciente virtual (origem_vp_id), a dupla recebe o do paciente que a pessoa A atendeu; senão, rodízio.
// O gabarito nunca sai daqui. A prescrição fica numa tabela privada e só passa por aqui.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, forbidden } from "../_shared/auth-guard.ts";
import { pacienteVirtualDoSoap } from "../_shared/soap-vp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Campos que pertencem às etapas 1 e 2 (ids fixos do modelo v2).
const CAMPOS_BPMH = ["r2-transicao", "r2-alergias", "r2-dados", "r2-bpmh", "r2-pendencias"];

const soCampos = (answers: any, ids: string[]) => {
  const out: Record<string, unknown> = {};
  if (answers && typeof answers === "object") for (const id of ids) if (id in answers) out[id] = answers[id];
  return out;
};

/** Vínculo com o SOAP: o gravado na importação ou, na falta dele (aluno adicionado à mão ou pela turma), o do mesmo e-mail nas salas SOAP v2 do professor. */
async function soapParticipanteDe(db: any, sala: any, m: { soap_participant_id?: string | null; student_email?: string | null }): Promise<string | null> {
  if (m.soap_participant_id) return m.soap_participant_id;
  const email = (m.student_email || "").trim();
  if (!email) return null;
  let salaIds: string[] = [];
  if (sala.soap_room_id) salaIds = [sala.soap_room_id];
  else {
    const { data: salas } = await db.from("soap_rooms").select("id").eq("user_id", sala.user_id).eq("schema_version", 2);
    salaIds = (salas || []).map((r: any) => r.id);
  }
  if (!salaIds.length) return null;
  const { data } = await db.from("soap_participants").select("id").in("room_id", salaIds).eq("participant_role", "student")
    .ilike("student_email", email).order("created_at", { ascending: false }).limit(1);
  return data?.[0]?.id || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, access_code, email, answers, fontes_abertas } = await req.json();
    if (!["estado", "enviar_bpmh", "enviar_final", "importar_soap"].includes(action)) return json({ error: "Ação inválida" }, 400);
    if (typeof access_code !== "string" || access_code.trim().length < 4 || typeof email !== "string" || !email.trim()) return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    const { data: sala } = await db.from("reconciliation_rooms")
      .select("id, status, schema_version, title, user_id, soap_room_id").eq("access_code", access_code.trim().toLowerCase()).eq("status", "active").maybeSingle();
    if (!sala || sala.schema_version !== 2) return forbidden(corsHeaders);

    const { data: partes } = await db.from("reconciliation_participants")
      .select("id, pair_index, pair_position, student_name, soap_participant_id").eq("room_id", sala.id).eq("participant_role", "student")
      .eq("student_email", email.trim().toLowerCase());
    const eu = partes?.[0];
    if (!eu) return forbidden(corsHeaders);
    if (eu.pair_index < 0) return json({ error: "Você ainda não está em uma dupla. Avise o professor." }, 409);

    // Caso da dupla.
    const { data: casos } = await db.from("reconciliation_clinical_cases")
      .select("id, title, caso_json, position").eq("room_id", sala.id).order("position", { ascending: true });
    const lista = (casos || []).filter((c: any) => c.caso_json);
    if (!lista.length) return json({ error: "A sala não tem caso v2 cadastrado." }, 409);

    const { data: resp } = await db.from("reconciliation_responses")
      .select("id, answers_json, bpmh_json, bpmh_submitted_at, fontes_json, submitted_at, clinical_case_id")
      .eq("room_id", sala.id).eq("pair_index", eu.pair_index).maybeSingle();

    // 1) Se a dupla já tem resposta, o caso gravado nela é o caso (não muda no meio do caminho).
    let caso: any = resp?.clinical_case_id ? lista.find((c: any) => c.id === resp.clinical_case_id) : null;
    // 2) Pelo paciente que a pessoa A da dupla atendeu (casos derivados de paciente virtual).
    if (!caso && lista.some((c: any) => c.caso_json?.origem_vp_id)) {
      const { data: dupla } = await db.from("reconciliation_participants")
        .select("pair_position, soap_participant_id, student_email").eq("room_id", sala.id).eq("participant_role", "student").eq("pair_index", eu.pair_index);
      const ordem = [...(dupla || [])].sort((a: any, b: any) => (a.pair_position === "A" ? -1 : 0) - (b.pair_position === "A" ? -1 : 0));
      for (const m of ordem) {
        const { vpId } = await pacienteVirtualDoSoap(db, await soapParticipanteDe(db, sala, m), sala.user_id);
        const achado = vpId ? lista.find((c: any) => c.caso_json?.origem_vp_id === vpId) : null;
        if (achado) { caso = achado; break; }
      }
    }
    // 3) Rodízio pelo índice da dupla, como na v1.
    if (!caso) caso = lista[eu.pair_index % lista.length];

    const { data: form } = await db.from("reconciliation_forms")
      .select("id").eq("room_id", sala.id).eq("form_type", "reconciliation").limit(1).maybeSingle();
    if (!form) return json({ error: "A sala não tem formulário." }, 409);

    const entregarPrescricao = async () => {
      const { data: priv } = await db.from("reconciliation_v2_privado").select("prescricao").eq("case_id", caso.id).maybeSingle();
      return Array.isArray(priv?.prescricao) ? priv!.prescricao : null;
    };

    if (action === "estado") {
      const enviada = !!resp?.bpmh_submitted_at;
      const prescricao = enviada ? await entregarPrescricao() : null;
      if (enviada && prescricao === null) return json({ error: "O caso não tem prescrição cadastrada. Avise o professor." }, 409);
      return json({
        sala: { id: sala.id, titulo: sala.title },
        parceiro: null,
        caso: { id: caso.id, titulo: caso.title, caso_json: caso.caso_json },
        formulario_id: form.id,
        bpmh_enviada: enviada,
        bpmh: enviada ? resp!.bpmh_json : null,
        fontes_abertas: resp?.fontes_json ?? null,
        prescricao,
        finalizada: !!resp?.submitted_at,
        respostas: resp?.submitted_at ? resp.answers_json : null,
      });
    }

    if (resp?.submitted_at) return json({ error: "A resposta desta dupla já foi enviada." }, 409);

    if (action === "importar_soap") {
      if (resp?.bpmh_submitted_at) return json({ error: "A BPMH já foi enviada e está travada." }, 409);
      const origem = caso.caso_json?.origem_vp_id;
      if (!origem) return json({ error: "Este caso não foi derivado de um paciente virtual, então não há SOAP correspondente." }, 409);
      const meuSoap = await soapParticipanteDe(db, sala, { soap_participant_id: eu.soap_participant_id, student_email: email });
      if (!meuSoap) return json({ error: "Não encontrei o seu SOAP nesta turma. Avise o professor." }, 409);
      const { vpId } = await pacienteVirtualDoSoap(db, meuSoap, sala.user_id);
      if (vpId !== origem) return json({ error: "O paciente do seu SOAP não é o paciente deste caso." }, 409);
      const { data: soaps } = await db.from("soap_responses").select("answers_json")
        .eq("participant_id", meuSoap).is("target_participant_id", null).not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false }).limit(1);
      const tabela = (soaps?.[0]?.answers_json as any)?.["s2-farmaco"];
      if (!Array.isArray(tabela)) return json({ error: "Seu SOAP enviado não tem a tabela de farmacoterapia preenchida." }, 409);
      const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "");
      // SOAP: [medicamento, prescrito, como realmente usa, discrepância]  →  BPMH: [medicamento, como realmente usa, fontes, última dose e conflito]
      const linhas = tabela
        .filter((r: unknown) => Array.isArray(r) && (txt(r[0]) || txt(r[2])))
        .slice(0, 12)
        .map((r: string[]) => [txt(r[0]), txt(r[2]), "", txt(r[3])]);
      if (!linhas.length) return json({ error: "A tabela de farmacoterapia do seu SOAP está vazia." }, 409);
      return json({ linhas });
    }

    if (action === "enviar_bpmh") {
      if (resp?.bpmh_submitted_at) {
        // Já travada: não regrava. Só devolve a prescrição, para o aluno que recarregou a página.
        const prescricao = await entregarPrescricao();
        return json({ bpmh_enviada: true, bpmh: resp.bpmh_json, prescricao: prescricao ?? [] });
      }
      const prescricao = await entregarPrescricao();
      if (prescricao === null || prescricao.length === 0) return json({ error: "O caso não tem prescrição cadastrada. Avise o professor." }, 409);

      const bpmh = soCampos(answers, CAMPOS_BPMH);
      const agora = new Date().toISOString();
      const linha = {
        answers_json: bpmh, bpmh_json: bpmh, bpmh_submitted_at: agora,
        fontes_json: Array.isArray(fontes_abertas) ? fontes_abertas.slice(0, 50) : [],
      };
      if (resp) {
        const { error } = await db.from("reconciliation_responses").update(linha).eq("id", resp.id);
        if (error) return json({ error: error.message }, 500);
      } else {
        const { error } = await db.from("reconciliation_responses").insert({
          room_id: sala.id, pair_index: eu.pair_index, form_id: form.id, clinical_case_id: caso.id, submitted_at: null, ...linha,
        });
        if (error) return json({ error: error.message }, 500);
      }
      return json({ bpmh_enviada: true, bpmh, prescricao });
    }

    // enviar_final
    if (!resp?.bpmh_submitted_at) return json({ error: "Envie a BPMH antes." }, 409);
    const final = { ...(answers && typeof answers === "object" ? answers : {}), ...(resp.bpmh_json as Record<string, unknown>) };
    const { error } = await db.from("reconciliation_responses").update({
      answers_json: final,
      fontes_json: Array.isArray(fontes_abertas) ? fontes_abertas.slice(0, 50) : resp.fontes_json,
      submitted_at: new Date().toISOString(),
    }).eq("id", resp.id);
    if (error) return json({ error: error.message }, 500);
    await db.from("reconciliation_participants").update({ status: "done" }).eq("room_id", sala.id).eq("pair_index", eu.pair_index);
    return json({ ok: true });
  } catch (e) {
    console.error("recon-v2-aluno error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
