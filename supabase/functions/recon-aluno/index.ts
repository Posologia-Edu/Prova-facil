// Reconciliação, lado do ALUNO: entrada na sala e envio da v1. O aluno se identifica com o PIN da sala e o próprio e-mail.
// Ações:
//  - "entrar": devolve a sala, o participante, o parceiro e, na v1, o formulário, o caso (sem a parte do professor) e a resposta já enviada.
//              Na v2 devolve só a sala e o participante; o resto vem de recon-v2-aluno.
//  - "enviar": grava a resposta da v1 e marca a dupla como concluída.
// Substitui as leituras e gravações diretas que a tela do aluno fazia nas tabelas reconciliation_*.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Casos antigos trazem, dentro do texto, a seção "DISCREPÂNCIAS PARA IDENTIFICAÇÃO (USO EXCLUSIVO DO PROFESSOR)". O aluno nunca a recebe.
const TEACHER_SECTION = /(^|\n)\s*DISCREP[ÂA]NCIAS PARA IDENTIFICA[ÇC][ÃA]O[\s\S]*$/i;
const semSecaoDoProfessor = (c: unknown) => (typeof c === "string" ? c : "").replace(TEACHER_SECTION, "").trim();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, access_code, email, answers } = await req.json();
    if (!["entrar", "enviar"].includes(action)) return json({ error: "Ação inválida" }, 400);
    if (typeof access_code !== "string" || access_code.trim().length < 4 || typeof email !== "string" || !email.trim()) return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    const { data: salas } = await db.from("reconciliation_rooms")
      .select("id, access_code, title, status, schema_version, tempo_etapa_min")
      .eq("access_code", access_code.trim().toLowerCase()).eq("status", "active").limit(1);
    const sala = salas?.[0];
    if (!sala) return json({ ok: false, motivo: "sala" });

    const { data: todos } = await db.from("reconciliation_participants")
      .select("id, student_name, student_email, pair_index, pair_position, status, participant_role").eq("room_id", sala.id);
    const alvo = email.trim().toLowerCase();
    const eu = (todos || []).find((p: any) => p.participant_role === "student" && (p.student_email || "").trim().toLowerCase() === alvo);
    if (!eu) return json({ ok: false, motivo: "email" });

    const salaPublica = { id: sala.id, access_code: sala.access_code, title: sala.title, schema_version: sala.schema_version, tempo_etapa_min: sala.tempo_etapa_min };
    const euPublico = { id: eu.id, student_name: eu.student_name, student_email: eu.student_email, pair_index: eu.pair_index, pair_position: eu.pair_position, status: eu.status };

    if (action === "entrar") {
      if (eu.status !== "done") await db.from("reconciliation_participants").update({ status: "ready" }).eq("id", eu.id);

      if (sala.schema_version === 2) return json({ ok: true, sala: salaPublica, participante: euPublico });

      let parceiro: { student_name: string } | null = null;
      if (eu.pair_index >= 0 && eu.pair_position !== "S") {
        const p = (todos || []).find((x: any) => x.id !== eu.id && x.pair_index === eu.pair_index);
        if (p) parceiro = { student_name: p.student_name };
      }
      const { data: form } = await db.from("reconciliation_forms").select("id, title, content_json")
        .eq("room_id", sala.id).eq("form_type", "reconciliation").limit(1).maybeSingle();
      const { data: casos } = await db.from("reconciliation_clinical_cases").select("id, title, content")
        .eq("room_id", sala.id).order("position", { ascending: true });
      const caso = casos?.length && eu.pair_index >= 0 ? casos[eu.pair_index % casos.length] : null;
      const { data: resp } = await db.from("reconciliation_responses").select("answers_json, submitted_at")
        .eq("room_id", sala.id).eq("pair_index", eu.pair_index).maybeSingle();
      return json({
        ok: true, sala: salaPublica, participante: euPublico, parceiro, formulario: form || null,
        caso: caso ? { id: caso.id, title: caso.title, content: semSecaoDoProfessor(caso.content) } : null,
        enviada: !!resp?.submitted_at,
        respostas: resp?.submitted_at ? resp.answers_json : null,
      });
    }

    // enviar (só v1; a v2 envia por recon-v2-aluno)
    if (sala.schema_version === 2) return json({ error: "Use o envio da v2." }, 400);
    if (eu.pair_index < 0) return json({ error: "Você ainda não está em uma dupla. Avise o professor." }, 409);
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) return json({ error: "Respostas inválidas" }, 400);
    if (JSON.stringify(answers).length > 500_000) return json({ error: "Resposta grande demais" }, 413);

    const { data: form } = await db.from("reconciliation_forms").select("id")
      .eq("room_id", sala.id).eq("form_type", "reconciliation").limit(1).maybeSingle();
    if (!form) return json({ error: "A sala não tem formulário." }, 409);
    const { data: casos } = await db.from("reconciliation_clinical_cases").select("id")
      .eq("room_id", sala.id).order("position", { ascending: true });
    const caso = casos?.length ? casos[eu.pair_index % casos.length] : null;

    const { data: existente } = await db.from("reconciliation_responses").select("id, submitted_at")
      .eq("room_id", sala.id).eq("pair_index", eu.pair_index).maybeSingle();
    if (existente?.submitted_at) return json({ error: "A resposta desta dupla já foi enviada." }, 409);
    const linha = { answers_json: answers, submitted_at: new Date().toISOString(), form_id: form.id, clinical_case_id: caso?.id || null };
    const { error } = existente
      ? await db.from("reconciliation_responses").update(linha).eq("id", existente.id)
      : await db.from("reconciliation_responses").insert({ room_id: sala.id, pair_index: eu.pair_index, ...linha });
    if (error) return json({ error: error.message }, 500);
    await db.from("reconciliation_participants").update({ status: "done" }).eq("room_id", sala.id).eq("pair_index", eu.pair_index);
    return json({ ok: true });
  } catch (e) {
    console.error("recon-aluno error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
