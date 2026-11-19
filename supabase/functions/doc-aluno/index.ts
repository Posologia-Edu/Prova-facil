// Documentação, lado do ALUNO: entrada na sala e envio. O aluno se identifica com o PIN da sala e o próprio e-mail.
// Ações:
//  - "entrar": devolve a sala, o participante, o parceiro, os dois formulários, o caso da dupla (sem a parte do professor),
//              e, se a atividade foi reaberta, as respostas anteriores; se já foi enviada, só avisa.
//  - "enviar": grava a resposta da dupla (encaminhamento e resumo de medicamentos) e marca a dupla como concluída.
// Substitui as leituras e gravações diretas que a tela do aluno fazia nas tabelas documentation_*.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Casos copiados da Reconciliação podem trazer a seção de uso exclusivo do professor. O aluno nunca a recebe.
const TEACHER_SECTION = /(^|\n)\s*DISCREP[ÂA]NCIAS PARA IDENTIFICA[ÇC][ÃA]O[\s\S]*$/i;
const semSecaoDoProfessor = (c: unknown) => (typeof c === "string" ? c : "").replace(TEACHER_SECTION, "").trim();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, access_code, email, referral_answers, med_rows } = await req.json();
    if (!["entrar", "enviar"].includes(action)) return json({ error: "Ação inválida" }, 400);
    if (typeof access_code !== "string" || access_code.trim().length < 4 || typeof email !== "string" || !email.trim()) return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    const { data: salas } = await db.from("documentation_rooms")
      .select("id, access_code, title, status")
      .eq("access_code", access_code.trim().toLowerCase()).eq("status", "active").limit(1);
    const sala = salas?.[0];
    if (!sala) return json({ ok: false, motivo: "sala" });

    const { data: todos } = await db.from("documentation_participants")
      .select("id, student_name, student_email, pair_index, pair_position, status").eq("room_id", sala.id);
    const alvo = email.trim().toLowerCase();
    const eu = (todos || []).find((p: any) => (p.student_email || "").trim().toLowerCase() === alvo);
    if (!eu) return json({ ok: false, motivo: "email" });

    const salaPublica = { id: sala.id, access_code: sala.access_code, title: sala.title };
    const euPublico = { id: eu.id, student_name: eu.student_name, student_email: eu.student_email, pair_index: eu.pair_index, pair_position: eu.pair_position, status: eu.status };

    const { data: forms } = await db.from("documentation_forms").select("id, form_type, title, content_json").eq("room_id", sala.id);
    const referral = (forms || []).find((f: any) => f.form_type === "referral") || null;
    const med = (forms || []).find((f: any) => f.form_type === "medication_summary") || null;

    if (action === "entrar") {
      if (eu.status !== "done") await db.from("documentation_participants").update({ status: "ready" }).eq("id", eu.id);

      let parceiro: { student_name: string } | null = null;
      if (eu.pair_index >= 0 && eu.pair_position !== "S") {
        const p = (todos || []).find((x: any) => x.id !== eu.id && x.pair_index === eu.pair_index);
        if (p) parceiro = { student_name: p.student_name };
      }
      const { data: casos } = await db.from("documentation_clinical_cases").select("id, title, content")
        .eq("room_id", sala.id).order("position", { ascending: true });
      const caso = casos?.length && eu.pair_index >= 0 ? casos[eu.pair_index % casos.length] : null;

      const { data: resps } = await db.from("documentation_responses").select("form_id, answers_json, submitted_at")
        .eq("room_id", sala.id).eq("pair_index", eu.pair_index);
      const enviada = !!resps?.some((r: any) => r.submitted_at);

      // Linha existente sem envio = o professor reabriu a atividade: devolve o que a dupla já tinha mandado
      let anteriores: { referral: unknown; medRows: unknown } | null = null;
      if (!enviada && resps?.length) {
        const r = resps.find((x: any) => x.form_id === referral?.id)?.answers_json;
        const m = resps.find((x: any) => x.form_id === med?.id)?.answers_json as any;
        anteriores = {
          referral: r && typeof r === "object" ? r : null,
          medRows: Array.isArray(m?.rows) ? m.rows : null,
        };
      }

      return json({
        ok: true, sala: salaPublica, participante: euPublico, parceiro,
        formularioEncaminhamento: referral, formularioMedicamentos: med,
        caso: caso ? { id: caso.id, title: caso.title, content: semSecaoDoProfessor(caso.content) } : null,
        enviada, anteriores,
      });
    }

    // enviar
    if (eu.pair_index < 0) return json({ error: "Você ainda não está em uma dupla. Avise o professor." }, 409);
    if (referral_answers != null && (typeof referral_answers !== "object" || Array.isArray(referral_answers))) return json({ error: "Respostas inválidas" }, 400);
    if (med_rows != null && !Array.isArray(med_rows)) return json({ error: "Respostas inválidas" }, 400);
    if (JSON.stringify([referral_answers, med_rows]).length > 500_000) return json({ error: "Resposta grande demais" }, 413);

    const { data: casos } = await db.from("documentation_clinical_cases").select("id")
      .eq("room_id", sala.id).order("position", { ascending: true });
    const caso = casos?.length ? casos[eu.pair_index % casos.length] : null;

    const { data: existentes } = await db.from("documentation_responses").select("id, form_id, submitted_at")
      .eq("room_id", sala.id).eq("pair_index", eu.pair_index);
    if (existentes?.some((r: any) => r.submitted_at)) return json({ error: "A resposta desta dupla já foi enviada." }, 409);

    const agora = new Date().toISOString();
    const gravar = async (formId: string, respostas: unknown) => {
      const linha = { answers_json: respostas, submitted_at: agora, clinical_case_id: caso?.id || null, form_id: formId };
      const existente = existentes?.find((r: any) => r.form_id === formId);
      return existente
        ? await db.from("documentation_responses").update(linha).eq("id", existente.id)
        : await db.from("documentation_responses").insert({ room_id: sala.id, pair_index: eu.pair_index, ...linha });
    };
    if (referral) { const { error } = await gravar(referral.id, referral_answers ?? {}); if (error) return json({ error: error.message }, 500); }
    if (med) { const { error } = await gravar(med.id, { rows: med_rows ?? [] }); if (error) return json({ error: error.message }, 500); }

    await db.from("documentation_participants").update({ status: "done" }).eq("room_id", sala.id).eq("pair_index", eu.pair_index);
    return json({ ok: true });
  } catch (e) {
    console.error("doc-aluno error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
