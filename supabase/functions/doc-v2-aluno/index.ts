// Documentação v2, lado do ALUNO. O aluno se identifica com o PIN da sala e o próprio e-mail.
// Ações:
//  - "estado": devolve o caso da dupla (dossiê derivado da Reconciliação v2), a conciliação de referência (a base do trabalho:
//              o que o paciente deve usar depois da transição) e, se já enviada, as respostas.
//  - "enviar": grava e trava as respostas da dupla (os quatro documentos) e marca a dupla como concluída.
// O gabarito (documentation_v2_privado.gabarito) NUNCA sai daqui. A conciliação de referência é entrada do aluno, não gabarito.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, forbidden } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const DOCUMENTOS = ["encaminhamento", "intervencao", "cartao", "plano"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, access_code, email, respostas } = await req.json();
    if (!["estado", "enviar"].includes(action)) return json({ error: "Ação inválida" }, 400);
    if (typeof access_code !== "string" || access_code.trim().length < 4 || typeof email !== "string" || !email.trim()) return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    const { data: sala } = await db.from("documentation_rooms")
      .select("id, title, status, schema_version, base_conciliacao, tempo_sugerido_min")
      .eq("access_code", access_code.trim().toLowerCase()).eq("status", "active").maybeSingle();
    if (!sala || sala.schema_version !== 2) return forbidden(corsHeaders);

    const { data: todos } = await db.from("documentation_participants")
      .select("id, student_name, student_email, pair_index, pair_position, status").eq("room_id", sala.id).eq("participant_role", "student");
    const alvo = email.trim().toLowerCase();
    const eu = (todos || []).find((p: any) => (p.student_email || "").trim().toLowerCase() === alvo);
    if (!eu) return forbidden(corsHeaders);
    if (eu.pair_index < 0) return json({ error: "Você ainda não está em uma dupla. Avise o professor." }, 409);

    const parceiroRow = eu.pair_position !== "S" ? (todos || []).find((p: any) => p.id !== eu.id && p.pair_index === eu.pair_index) : null;

    const { data: casos } = await db.from("documentation_clinical_cases")
      .select("id, title, caso_json, position").eq("room_id", sala.id).order("position", { ascending: true });
    const lista = (casos || []).filter((c: any) => c.caso_json);
    if (!lista.length) return json({ error: "A sala não tem caso v2 cadastrado." }, 409);

    const { data: resp } = await db.from("documentation_v2_respostas")
      .select("id, clinical_case_id, respostas, submitted_at").eq("room_id", sala.id).eq("pair_index", eu.pair_index).maybeSingle();
    // O caso gravado na resposta é o caso; senão, rodízio pelo índice da dupla.
    const caso = (resp?.clinical_case_id ? lista.find((c: any) => c.id === resp.clinical_case_id) : null) || lista[eu.pair_index % lista.length];

    if (action === "estado") {
      const { data: priv } = await db.from("documentation_v2_privado").select("referencia").eq("case_id", caso.id).maybeSingle();
      return json({
        sala: { id: sala.id, titulo: sala.title, tempo_sugerido_min: sala.tempo_sugerido_min },
        participante: { id: eu.id, nome: eu.student_name, pair_index: eu.pair_index, pair_position: eu.pair_position },
        parceiro: parceiroRow ? { nome: parceiroRow.student_name } : null,
        caso: { id: caso.id, titulo: caso.title, caso_json: caso.caso_json },
        referencia: Array.isArray(priv?.referencia) ? priv!.referencia : [],
        enviada: !!resp?.submitted_at,
        respostas: resp?.submitted_at ? resp.respostas : null,
      });
    }

    // enviar
    if (resp?.submitted_at) return json({ error: "A resposta desta dupla já foi enviada." }, 409);
    if (!respostas || typeof respostas !== "object" || Array.isArray(respostas)) return json({ error: "Respostas inválidas" }, 400);
    if (JSON.stringify(respostas).length > 300_000) return json({ error: "Resposta grande demais" }, 413);
    // Guarda só os documentos conhecidos.
    const limpas: Record<string, unknown> = {};
    for (const d of DOCUMENTOS) if (d in respostas) limpas[d] = respostas[d];

    const agora = new Date().toISOString();
    if (resp) {
      const { error } = await db.from("documentation_v2_respostas").update({ respostas: limpas, submitted_at: agora, updated_at: agora }).eq("id", resp.id);
      if (error) return json({ error: error.message }, 500);
    } else {
      const { error } = await db.from("documentation_v2_respostas").insert({
        room_id: sala.id, pair_index: eu.pair_index, clinical_case_id: caso.id, respostas: limpas, submitted_at: agora,
      });
      if (error) return json({ error: error.message }, 500);
    }
    await db.from("documentation_participants").update({ status: "done" }).eq("room_id", sala.id).eq("pair_index", eu.pair_index);
    return json({ ok: true });
  } catch (e) {
    console.error("doc-v2-aluno error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
