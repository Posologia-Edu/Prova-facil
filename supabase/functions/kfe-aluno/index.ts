// KFE (Key Feature Exam), lado do ALUNO. A prova é aberta por link (id da prova); não há lista de alunos.
// A prova mostra o resultado de cada ponto-chave logo depois que o aluno confirma a resposta; por isso o gabarito é revelado
// ponto a ponto, e só depois da confirmação.
// Ações:
//  - "exame": título e casos com os pontos-chave SEM resposta certa nem explicação.
//  - "iniciar": cria a sessão do aluno (só com o exame ativo).
//  - "confirmar": grava a resposta de UM ponto-chave (uma única vez; a resposta não muda depois) e devolve se acertou,
//                 a alternativa certa (só nas de múltipla escolha) e a explicação.
//  - "enviar": fecha a sessão com a soma das notas gravadas.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// deno-lint-ignore no-explicit-any
function corrige(kf: any, resposta: unknown): number {
  const max = Number(kf.max_score) || 0;
  if (kf.question_type === "multiple_choice") return resposta === kf.correct_answer_json?.selected ? max : 0;
  if (kf.question_type === "short_answer") {
    const certo = String(kf.correct_answer_json?.text || "").trim().toLowerCase();
    const aluno = typeof resposta === "string" ? resposta.trim().toLowerCase() : "";
    return aluno === certo ? max : 0;
  }
  return 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const b = await req.json();
    const { action } = b;
    if (!["exame", "iniciar", "confirmar", "enviar"].includes(action)) return json({ error: "Ação inválida" }, 400);
    const db = adminClient();

    if (action === "confirmar" || action === "enviar") {
      if (typeof b.session_id !== "string" || !UUID.test(b.session_id)) return json({ error: "Dados inválidos" }, 400);
      const { data: sessao } = await db.from("kfe_sessions").select("id, kfe_exam_id, status").eq("id", b.session_id).maybeSingle();
      if (!sessao) return json({ ok: false, motivo: "sessao" }, 404);
      if (sessao.status !== "in_progress") return json({ ok: false, motivo: "ja_enviada" });

      const { data: casos } = await db.from("kfe_cases").select("id").eq("kfe_exam_id", sessao.kfe_exam_id);
      const casoIds = (casos || []).map((c: any) => c.id);
      const { data: kfs } = casoIds.length
        ? await db.from("kfe_key_features").select("id, question_type, correct_answer_json, max_score, explanation").in("case_id", casoIds)
        : { data: [] as any[] };
      const porId = new Map<string, any>((kfs || []).map((k: any) => [k.id, k]));

      if (action === "confirmar") {
        const kf = typeof b.key_feature_id === "string" ? porId.get(b.key_feature_id) : null;
        if (!kf) return json({ error: "Ponto-chave inválido" }, 400);
        const resposta = typeof b.answer === "string" ? b.answer.slice(0, 5000) : null;
        if (resposta === null || (kf.question_type === "multiple_choice" && !resposta)) return json({ error: "Resposta inválida" }, 400);

        // a primeira confirmação vale; repetir devolve o que já foi gravado (não dá para testar alternativas até acertar)
        const { data: ja } = await db.from("kfe_answers").select("score").eq("session_id", sessao.id).eq("key_feature_id", kf.id).limit(1).maybeSingle();
        let pontos: number;
        if (ja) pontos = Number(ja.score) || 0;
        else {
          pontos = corrige(kf, resposta);
          const { error } = await db.from("kfe_answers").insert({ session_id: sessao.id, key_feature_id: kf.id, answer_json: { value: resposta }, score: pontos });
          if (error) return json({ error: error.message }, 500);
        }
        return json({
          ok: true, correto: pontos > 0,
          alternativa_certa: kf.question_type === "multiple_choice" ? kf.correct_answer_json?.selected ?? null : null,
          explicacao: kf.explanation || "",
        });
      }

      // enviar: pontos-chave sem confirmação ficam com 0
      const { data: feitas } = await db.from("kfe_answers").select("key_feature_id, score").eq("session_id", sessao.id);
      const confirmadas = new Set((feitas || []).map((a: any) => a.key_feature_id));
      const faltam = [...porId.values()].filter((k: any) => !confirmadas.has(k.id))
        .map((k: any) => ({ session_id: sessao.id, key_feature_id: k.id, answer_json: { value: null }, score: 0 }));
      if (faltam.length) {
        const { error } = await db.from("kfe_answers").insert(faltam);
        if (error) return json({ error: error.message }, 500);
      }
      const total = (feitas || []).reduce((s: number, a: any) => s + (Number(a.score) || 0), 0);
      const max = [...porId.values()].reduce((s: number, k: any) => s + (Number(k.max_score) || 0), 0);
      const { error } = await db.from("kfe_sessions").update({ status: "submitted", finished_at: new Date().toISOString(), total_score: total, max_score: max }).eq("id", sessao.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, total, max });
    }

    if (typeof b.exam_id !== "string" || !UUID.test(b.exam_id)) return json({ error: "Dados inválidos" }, 400);
    const { data: prova } = await db.from("kfe_exams").select("id, title, status, deleted_at").eq("id", b.exam_id).maybeSingle();
    if (!prova || prova.deleted_at) return json({ ok: false, motivo: "prova" });

    if (action === "exame") {
      if (prova.status !== "active") return json({ ok: true, titulo: prova.title, status: prova.status, casos: [], pontos: [] });
      const { data: casos } = await db.from("kfe_cases").select("id, position, title, clinical_scenario").eq("kfe_exam_id", prova.id).order("position");
      const ids = (casos || []).map((c: any) => c.id);
      const { data: kfs } = ids.length
        ? await db.from("kfe_key_features").select("id, case_id, position, question_text, question_type, options_json, max_score").in("case_id", ids).order("position")
        : { data: [] as any[] };
      // alternativas só com id e texto
      const pontos = (kfs || []).map((k: any) => ({
        ...k, options_json: (Array.isArray(k.options_json) ? k.options_json : []).map((o: any) => ({ id: o?.id, text: o?.text ?? "" })),
      }));
      return json({ ok: true, titulo: prova.title, status: prova.status, casos: casos || [], pontos });
    }

    // iniciar
    if (prova.status !== "active") return json({ ok: false, motivo: "fechada" });
    const nome = typeof b.name === "string" ? b.name.trim().slice(0, 200) : "";
    const email = typeof b.email === "string" ? b.email.trim().slice(0, 200) : "";
    if (!nome || !email) return json({ error: "Preencha nome e e-mail" }, 400);
    const { data: nova, error } = await db.from("kfe_sessions").insert({ kfe_exam_id: prova.id, student_name: nome, student_email: email }).select("id").single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, session_id: nova.id });
  } catch (e) {
    console.error("kfe-aluno error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
