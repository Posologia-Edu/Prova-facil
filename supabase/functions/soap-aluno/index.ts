// SOAP, lado do ALUNO (v1 e v2). O aluno se identifica com o PIN da sala e o próprio e-mail.
// Substitui as leituras e gravações diretas que a tela do aluno fazia nas tabelas soap_* e simulation_*.
// Ações:
//  - "entrar":          sala, participante, parceiro, formulários, registro da anamnese, estado do envio e da avaliação entre pares.
//  - "par":             estado do colega (usado a cada 5 s enquanto o aluno espera): fase e, se já enviou, o SOAP dele.
//  - "enviar_soap":     grava o SOAP (uma vez), calcula no servidor se o par está ausente e atualiza o status.
//  - "enviar_avaliacao": grava a avaliação do SOAP do colega.
// Mudança de segurança: a busca do registro da anamnese quando não há vínculo agora fica restrita às salas de anamnese do
// MESMO professor da sala SOAP (antes varria as últimas 500 pessoas de todas as salas).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const norm = (s: unknown) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const LIMITE = 500_000;

type Db = ReturnType<typeof adminClient>;

/** Participante da anamnese do aluno: o vínculo gravado ou, na falta dele, e-mail e depois nome, só entre as salas do mesmo professor. */
async function resolverAnamnese(db: Db, sala: any, me: any): Promise<string | null> {
  if (me.anamnesis_participant_id) return me.anamnesis_participant_id;
  let salaIds: string[] = [];
  if (sala.anamnesis_room_id) salaIds = [sala.anamnesis_room_id];
  else {
    const { data: salas } = await db.from("simulation_rooms").select("id").eq("user_id", sala.user_id);
    salaIds = (salas || []).map((r: any) => r.id);
  }
  if (!salaIds.length) return null;
  const { data: cand } = await db.from("simulation_participants")
    .select("id, student_name, student_email, created_at").in("room_id", salaIds).order("created_at", { ascending: false }).limit(1000);
  const email = String(me.student_email || "").trim().toLowerCase();
  let achados = (cand || []).filter((p: any) => email && String(p.student_email || "").trim().toLowerCase() === email);
  if (!achados.length && me.student_name) achados = (cand || []).filter((p: any) => norm(p.student_name) === norm(me.student_name));
  for (const c of achados) {
    const { data: subs } = await db.from("simulation_responses").select("id").eq("participant_id", c.id).not("submitted_at", "is", null).limit(1);
    if (subs?.length) {
      await db.from("soap_participants").update({ anamnesis_participant_id: c.id }).eq("id", me.id);
      return c.id;
    }
  }
  return null;
}

/** Registro (anamnese preenchida) pelo vínculo explícito; vale o último enviado. */
async function carregarRegistro(db: Db, anamPid: string) {
  const { data: part } = await db.from("simulation_participants").select("id, room_id").eq("id", anamPid).maybeSingle();
  if (!part?.room_id) return null;
  const { data: forms } = await db.from("simulation_forms").select("id, form_type, content_json").eq("room_id", part.room_id).in("form_type", ["anamnesis", "standard"]);
  if (!forms?.length) return null;
  const { data: resps } = await db.from("simulation_responses").select("form_id, answers_json, submitted_at")
    .eq("participant_id", anamPid).in("form_id", forms.map((f: any) => f.id)).not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false }).limit(1);
  const resp = resps?.[0];
  if (!resp?.answers_json) return null;
  const form = forms.find((f: any) => f.id === resp.form_id);
  if (!form) return null;
  const answers: Record<string, any> = {};
  for (const [k, v] of Object.entries(resp.answers_json as Record<string, any>)) if (!k.startsWith("_")) answers[k] = v;
  return { fields: Array.isArray(form.content_json) ? form.content_json : [], answers, roomId: part.room_id, submittedAt: resp.submitted_at ?? null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, access_code, email, answers } = await req.json();
    if (!["entrar", "par", "enviar_soap", "enviar_avaliacao"].includes(action)) return json({ error: "Ação inválida" }, 400);
    if (typeof access_code !== "string" || access_code.trim().length < 4 || typeof email !== "string" || !email.trim()) return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    const { data: salas } = await db.from("soap_rooms")
      .select("id, access_code, title, status, schema_version, anamnesis_room_id, user_id")
      .eq("access_code", access_code.trim().toLowerCase()).eq("status", "active").limit(1);
    const sala = salas?.[0];
    if (!sala) return json({ ok: false, motivo: "sala" });

    const { data: todos } = await db.from("soap_participants")
      .select("id, student_name, student_email, pair_index, pair_position, status, participant_role, anamnesis_participant_id").eq("room_id", sala.id);
    const alvo = email.trim().toLowerCase();
    const eu: any = (todos || []).find((p: any) => (p.student_email || "").trim().toLowerCase() === alvo);
    if (!eu) return json({ ok: false, motivo: "email" });

    const solo = eu.pair_position === "S";
    const parceiroRow: any = !solo && eu.pair_index >= 0 ? (todos || []).find((p: any) => p.id !== eu.id && p.pair_index === eu.pair_index) : null;
    const parceiroPub = parceiroRow ? { id: parceiroRow.id, student_name: parceiroRow.student_name, status: parceiroRow.status } : null;
    const salaPub = { id: sala.id, access_code: sala.access_code, title: sala.title, schema_version: sala.schema_version, anamnesis_room_id: sala.anamnesis_room_id };

    const soapDe = async (participanteId: string) => {
      const { data } = await db.from("soap_responses").select("id, answers_json").eq("room_id", sala.id).eq("participant_id", participanteId).is("target_participant_id", null).limit(1);
      return data?.[0] || null;
    };

    // Estado do colega: fase da avaliação entre pares.
    const faseDoPar = async () => {
      if (!parceiroRow) return { fase: null as string | null, respostas_parceiro: null as any };
      const dele = await soapDe(parceiroRow.id);
      if (!dele) return { fase: "waiting_peer", respostas_parceiro: null };
      const { data: minha } = await db.from("soap_responses").select("id").eq("room_id", sala.id).eq("participant_id", eu.id).eq("target_participant_id", parceiroRow.id).limit(1);
      return { fase: minha?.length ? "done" : "evaluate", respostas_parceiro: dele.answers_json };
    };

    if (action === "entrar") {
      if (eu.status === "waiting") await db.from("soap_participants").update({ status: "joined" }).eq("id", eu.id);

      const anamPid = await resolverAnamnese(db, sala, eu);
      let patientName: string | null = null;
      let anamnesisAnswers: Record<string, any> = {};
      let anamnesisFieldLabels: Record<string, string> = {};
      let registro: any = null;
      if (anamPid) {
        const { data: minhaAnam } = await db.from("simulation_participants").select("pair_index, room_id").eq("id", anamPid).maybeSingle();
        if (minhaAnam && minhaAnam.pair_index >= 0) {
          const { data: par } = await db.from("simulation_participants").select("student_name")
            .eq("room_id", minhaAnam.room_id).eq("pair_index", minhaAnam.pair_index).neq("id", anamPid).limit(1).maybeSingle();
          if (par) patientName = par.student_name;
        }
        const { data: respostas } = await db.from("simulation_responses").select("answers_json, form_id").eq("participant_id", anamPid);
        if (respostas?.length) {
          for (const r of respostas) Object.assign(anamnesisAnswers, r.answers_json as Record<string, any>);
          const formIds = [...new Set(respostas.map((r: any) => r.form_id))];
          const { data: forms } = await db.from("simulation_forms").select("content_json").in("id", formIds);
          for (const f of forms || []) if (Array.isArray(f.content_json)) for (const c of f.content_json as any[]) if (c?.id && c?.label) anamnesisFieldLabels[c.id] = c.label;
        }
        registro = await carregarRegistro(db, anamPid);
      }
      // Anamnese com rótulos legíveis, para a correção por IA da v1.
      const anamneseRotulada: Record<string, any> = {};
      if (registro) {
        for (const [k, v] of Object.entries(registro.answers as Record<string, any>)) {
          const campo = (registro.fields as any[]).find((f: any) => f.id === k);
          anamneseRotulada[campo?.label || k] = v;
        }
      }

      const { data: forms } = await db.from("soap_forms").select("id, form_type, title, content_json").eq("room_id", sala.id);
      const soapForm = (forms || []).find((f: any) => f.form_type === "soap") || null;
      const peerForm = (forms || []).find((f: any) => f.form_type === "peer_evaluation") || null;
      const meuSoap = await soapDe(eu.id);
      const par = meuSoap && parceiroRow ? await faseDoPar() : { fase: null, respostas_parceiro: null };

      return json({
        ok: true, sala: salaPub, participante: { ...eu, anamnesis_participant_id: anamPid }, parceiro: parceiroPub,
        patientName, anamnesisAnswers, anamnesisFieldLabels, registro, anamneseRotulada,
        soapForm, peerForm, soapEnviado: !!meuSoap, fasePar: par.fase, respostasParceiro: par.respostas_parceiro,
      });
    }

    if (action === "par") {
      const p = await faseDoPar();
      return json({ ok: true, parceiro: parceiroPub, fase: p.fase, respostas_parceiro: p.respostas_parceiro });
    }

    if (action === "enviar_soap") {
      if (!answers || typeof answers !== "object" || Array.isArray(answers)) return json({ error: "Respostas inválidas" }, 400);
      if (JSON.stringify(answers).length > LIMITE) return json({ error: "Resposta grande demais" }, 413);
      const { data: form } = await db.from("soap_forms").select("id").eq("room_id", sala.id).eq("form_type", "soap").limit(1).maybeSingle();
      if (!form) return json({ error: "A sala não tem formulário SOAP." }, 409);

      // Par ausente: só vale para duplas A/B. Sem colega na sala, ou colega que nunca entrou e não enviou nada.
      let partnerAbsent = false;
      if (!solo && eu.pair_index >= 0) {
        if (!parceiroRow) partnerAbsent = true;
        else if (parceiroRow.status === "waiting") {
          const { data: dele } = await db.from("soap_responses").select("id").eq("participant_id", parceiroRow.id).eq("room_id", sala.id).limit(1);
          partnerAbsent = !dele?.length;
        }
      }

      const jaTem = await soapDe(eu.id);
      let responseId: string | null = jaTem?.id || null;
      let jaEnviado = !!jaTem;
      if (!jaTem) {
        const { data: nova, error } = await db.from("soap_responses")
          .insert({ room_id: sala.id, participant_id: eu.id, form_id: form.id, answers_json: answers, needs_teacher_peer_eval: partnerAbsent })
          .select("id").single();
        if (error) {
          if ((error as any).code === "23505") { jaEnviado = true; const dup = await soapDe(eu.id); responseId = dup?.id || null; }
          else return json({ error: error.message }, 500);
        } else responseId = nova.id;
      }
      await db.from("soap_participants").update({ status: "submitted" }).eq("id", eu.id);
      if (solo) await db.from("soap_participants").update({ status: "done" }).eq("id", eu.id);
      else if (partnerAbsent) await db.from("soap_participants").update({ status: "awaiting_teacher_peer" }).eq("id", eu.id);
      return json({ ok: true, response_id: responseId, ja_enviado: jaEnviado, partner_absent: partnerAbsent, solo });
    }

    // enviar_avaliacao
    if (!parceiroRow) return json({ error: "Você não tem colega de dupla nesta sala." }, 409);
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) return json({ error: "Respostas inválidas" }, 400);
    if (JSON.stringify(answers).length > LIMITE) return json({ error: "Resposta grande demais" }, 413);
    const { data: peerForm } = await db.from("soap_forms").select("id").eq("room_id", sala.id).eq("form_type", "peer_evaluation").limit(1).maybeSingle();
    if (!peerForm) return json({ error: "A sala não tem formulário de avaliação." }, 409);
    if (!(await soapDe(parceiroRow.id))) return json({ error: "O seu colega ainda não enviou o SOAP." }, 409);
    const { data: jaAvaliou } = await db.from("soap_responses").select("id").eq("room_id", sala.id).eq("participant_id", eu.id).eq("target_participant_id", parceiroRow.id).maybeSingle();
    if (jaAvaliou?.id) return json({ ok: true, ja_enviado: true });
    const { error } = await db.from("soap_responses").insert({ room_id: sala.id, participant_id: eu.id, target_participant_id: parceiroRow.id, form_id: peerForm.id, answers_json: answers });
    if (error) {
      if ((error as any).code === "23505") return json({ ok: true, ja_enviado: true });
      return json({ error: error.message }, 500);
    }
    return json({ ok: true, ja_enviado: false });
  } catch (e) {
    console.error("soap-aluno error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
