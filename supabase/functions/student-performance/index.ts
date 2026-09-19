import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

// Called by an external system (a WhatsApp AI-agent platform, wp.agents) to
// let a "performance consultant" agent look up a student's own results by
// e-mail and explain what they got wrong. Mirrors, on purpose, the
// student-performance function in the sibling posologia-clinical-hub
// (simulador) repo — same two-step e-mail+code verification shape, same
// shared-secret auth header — so the wp.agents side can reuse the exact
// same integration/prompt pattern for both platforms.
//
// Two-step flow, to stop a classmate from reading someone else's grades by
// just typing their e-mail (there's no other identity check on the WhatsApp
// side — the agent only knows what the conversation tells it):
//   1. Called with only `email` -> generates a 6-digit code, e-mails it to
//      that address, returns {status:"code_sent"}. The agent is expected to
//      ask the student for the code they received.
//   2. Called with `email` + `code` -> validates the code (correct, not
//      expired, not already used, capped attempts) and only then returns
//      the actual results.
//
// Unlike the simulador repo, "results" here spans two very different shapes
// (see findStudentPerformance below):
//   - `provas`: traditional exams (exam_sessions/student_answers), the
//     closest analog to the simulador's MC-question review — per-question
//     correct/incorrect + points.
//   - `simulacao_realistica`: the "Agregador de Notas" join across the 4
//     pharmacy-simulation modules (Anamnese/SOAP/Reconciliação/
//     Documentação), ported here from src/pages/SimulationAggregator.tsx
//     (a client-only React component with no server-side equivalent before
//     this) — AI-graded, rubric/field-based feedback rather than fixed
//     right/wrong questions.
//
// Every module here identifies a participant by a freely-typed
// `student_email` column with no FK to any central roster (confirmed by
// inspecting every participant table) — same situation as the simulador
// repo, so the same e-mail-based, no-central-identity caveats apply.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-wpagents-key",
};

const MAX_EXAM_SESSIONS = 10;
// Bounds the SOAP/reconciliation/documentation/anamnese scans below to
// recent rooms, so this doesn't grow unbounded as rooms accumulate over
// semesters/years.
const ROOM_SCAN_SINCE_DAYS = 365;

const CODE_TTL_MINUTES = 10;
const MAX_CODE_REQUESTS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const FROM_EMAIL = "ProvaFácil <noreply@tbl.posologia.app>";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendVerificationEmail(email: string, code: string) {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: "Seu código de verificação — Consultor de Desempenho",
    html: `
      <p>Olá!</p>
      <p>Alguém (esperamos que você 😊) pediu para consultar seu desempenho recente pelo assistente no WhatsApp.</p>
      <p>Seu código de verificação é:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p>Ele expira em ${CODE_TTL_MINUTES} minutos. Se você não pediu isso, pode ignorar este e-mail.</p>
    `,
  });
  if (error) throw new Error(typeof error === "string" ? error : error.message || "Falha ao enviar e-mail");
}

// ─────────────────────────────────────────────────────────────────────────
// Provas (exams) — the clean, structured module: per-question correct/
// incorrect + points, same spirit as the simulador repo's
// actions.questions[] shape.
// ─────────────────────────────────────────────────────────────────────────

function questionStem(content: Record<string, any>): string {
  return content?.stem || content?.question_text || content?.statement || "Questão";
}

async function findExamResults(supabase: any, email: string) {
  const { data: sessions, error: sessErr } = await supabase
    .from("exam_sessions")
    .select("id, publication_id, total_score, max_score, status, finished_at")
    .eq("student_email", email)
    .in("status", ["submitted", "graded"])
    .order("finished_at", { ascending: false })
    .limit(MAX_EXAM_SESSIONS);
  if (sessErr) throw sessErr;
  if (!sessions?.length) return [];

  const publicationIds = Array.from(new Set(sessions.map((s: any) => s.publication_id)));
  const { data: publications, error: pubErr } = await supabase
    .from("exam_publications")
    .select("id, exam_id")
    .in("id", publicationIds);
  if (pubErr) throw pubErr;
  const examIdByPubId = new Map((publications || []).map((p: any) => [p.id, p.exam_id]));

  const examIds = Array.from(new Set(Array.from(examIdByPubId.values())));
  const { data: exams, error: examErr } = await supabase
    .from("exams")
    .select("id, title")
    .in("id", examIds);
  if (examErr) throw examErr;
  const examTitleById = new Map((exams || []).map((e: any) => [e.id, e.title]));

  const sessionIds = sessions.map((s: any) => s.id);
  const { data: answers, error: ansErr } = await supabase
    .from("student_answers")
    .select("session_id, question_id, answer_text, answer_json, is_correct, points_earned, max_points, grading_status, ai_score, ai_feedback, teacher_score, teacher_feedback, question_bank(type, content_json)")
    .in("session_id", sessionIds);
  if (ansErr) throw ansErr;

  return sessions.map((sess: any) => {
    const examId = examIdByPubId.get(sess.publication_id);
    const sessAnswers = (answers || []).filter((a: any) => a.session_id === sess.id);

    const questoes_erradas = sessAnswers
      .map((a: any) => {
        const bq = a.question_bank || {};
        const content = (bq.content_json || {}) as Record<string, any>;
        const type = bq.type;
        const pergunta = questionStem(content);

        if (type === "multiple_choice" || type === "true_false") {
          if (a.is_correct !== false) return null;
          const alternatives = Array.isArray(content.alternatives) ? content.alternatives : [];
          const selectedLetter = a.answer_json?.selected;
          const correctAlt = alternatives.find((alt: any) => alt.correct);
          const selectedAlt = alternatives.find((alt: any) => String(alt.letter) === String(selectedLetter));
          return {
            pergunta,
            resposta_do_aluno: selectedAlt?.text || (selectedLetter ? `Alternativa ${selectedLetter}` : "(não respondida)"),
            resposta_correta: correctAlt?.text || null,
            explicacao: content.explanation || null,
          };
        }

        // open_ended / matching: only surface it as "wrong" once it's been
        // graded (by a teacher or the AI) and scored below the max — pending
        // ungraded answers have no verdict yet.
        if (a.grading_status === "pending") return null;
        const finalScore = a.teacher_score ?? a.ai_score ?? a.points_earned;
        const maxPoints = a.max_points ?? 1;
        if (finalScore == null || Number(finalScore) >= Number(maxPoints)) return null;
        return {
          pergunta,
          resposta_do_aluno: a.answer_text || "(não respondida)",
          resposta_correta: null,
          explicacao: (a.teacher_feedback || a.ai_feedback || null),
          nota: `${finalScore}/${maxPoints}`,
        };
      })
      .filter(Boolean);

    return {
      titulo: examTitleById.get(examId) || "Prova",
      pontuacao: sess.total_score,
      pontuacao_maxima: sess.max_score,
      data: sess.finished_at,
      total_questoes_erradas: questoes_erradas.length,
      questoes_erradas,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Simulação Realística (Agregador de Notas) — ported from
// src/pages/SimulationAggregator.tsx + src/lib/soap-grades.ts, which only
// existed as client-side React code before this. Queried globally by
// e-mail (not scoped to one teacher's rooms) since this is called by a
// single external caller identified by e-mail, not a logged-in teacher.
// ─────────────────────────────────────────────────────────────────────────

// Verbatim port of src/components/forms/types.ts's computeFieldScore — pure
// logic, no React dependency, safe to copy as-is.
function computeFieldScore(field: any, answerValue: any): number {
  if (!field.max_score || answerValue == null) return 0;

  if (field.type === "radio" || field.type === "dropdown") {
    if (field.options) {
      const selectedIdx = field.options.indexOf(String(answerValue));
      if (field.option_scores && selectedIdx >= 0) {
        const optScore = field.option_scores[String(selectedIdx)];
        if (optScore != null) return Math.min(optScore, field.max_score);
      }
      if (field.correct_answer != null) {
        const correctIdx = Number(field.correct_answer);
        return selectedIdx === correctIdx ? field.max_score : 0;
      }
    }
    const numVal = Number(answerValue) || 0;
    return Math.min(numVal, field.max_score);
  }

  if (field.type === "checkbox") {
    if (field.options) {
      const selectedValues = Array.isArray(answerValue) ? answerValue : [answerValue];
      const selectedIndices = selectedValues.map((v: any) => field.options!.indexOf(String(v))).filter((i: number) => i >= 0);
      if (field.option_scores && Object.keys(field.option_scores).length > 0) {
        const total = selectedIndices.reduce((sum: number, idx: number) => {
          const optScore = field.option_scores![String(idx)];
          return sum + (optScore != null ? optScore : 0);
        }, 0);
        return Math.min(total, field.max_score);
      }
      if (field.correct_answer != null && Array.isArray(field.correct_answer)) {
        const correctSet = new Set((field.correct_answer as number[]).map(Number));
        const selectedSet = new Set(selectedIndices);
        const isCorrect = correctSet.size === selectedSet.size && [...correctSet].every((i) => selectedSet.has(i));
        return isCorrect ? field.max_score : 0;
      }
    }
    const numVal = Number(answerValue) || 0;
    return Math.min(numVal, field.max_score);
  }

  const value = Number(answerValue) || 0;

  if (field.type === "scale") {
    const scaleMax = field.scale_max || field.max_score || 10;
    if (scaleMax === 0) return 0;
    return (value / scaleMax) * field.max_score;
  }

  if (field.type === "rating") {
    const ratingMax = field.rating_max || 5;
    if (ratingMax === 0) return 0;
    return (value / ratingMax) * field.max_score;
  }

  return Math.min(value, field.max_score);
}

// Port of src/lib/soap-grades.ts's calculateSoapStudentGrade.
function calculateSoapStudentGrade(peerEvaluation: any, soapResponse: any, evaluationFields: any[], isSolo: boolean) {
  let peerScore: number | null = null;
  if (peerEvaluation && evaluationFields.length > 0) {
    let totalScore = 0;
    let totalMax = 0;
    for (const field of evaluationFields) {
      if (!field.max_score) continue;
      totalMax += field.max_score;
      const answers = peerEvaluation.answers_json;
      const answer = answers && typeof answers === "object" && !Array.isArray(answers) ? answers[field.id] : undefined;
      totalScore += computeFieldScore(field, answer);
    }
    peerScore = totalMax > 0 ? (totalScore / totalMax) * 10 : 0;
  }

  const toNumberOrNull = (v: any) => (v == null || v === "" ? null : (Number.isFinite(Number(v)) ? Number(v) : null));
  const adminScore = toNumberOrNull(soapResponse?.admin_score);
  const aiScore = toNumberOrNull(soapResponse?.ai_score);
  const effectivePeerScore = isSolo && peerScore == null && aiScore != null ? aiScore : peerScore;
  const scores = [effectivePeerScore, adminScore].filter((s): s is number => s != null);
  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}

const since = () => new Date(Date.now() - ROOM_SCAN_SINCE_DAYS * 24 * 60 * 60 * 1000).toISOString();

async function findAnamnesisScore(supabase: any, email: string) {
  const { data: participants } = await supabase
    .from("simulation_participants")
    .select("id, room_id")
    .ilike("student_email", email)
    .gte("created_at", since());
  if (!participants?.length) return null;
  const participantIds = participants.map((p: any) => p.id);
  const roomIds = Array.from(new Set(participants.map((p: any) => p.room_id)));

  const { data: rounds } = await supabase.from("simulation_rounds").select("id, room_id, status").in("room_id", roomIds).eq("status", "completed");
  const completedRoundIds = (rounds || []).map((r: any) => r.id);
  if (!completedRoundIds.length) return null;

  const { data: assignments } = await supabase
    .from("simulation_round_assignments")
    .select("round_id, participant_id, assigned_role")
    .in("round_id", completedRoundIds)
    .in("participant_id", participantIds)
    .eq("assigned_role", "professional");
  if (!assignments?.length) return null;

  const { data: forms } = await supabase.from("simulation_forms").select("id, form_type, room_id").in("room_id", roomIds);
  const evalFormIds = new Set((forms || []).filter((f: any) => f.form_type === "professor_eval" || f.form_type === "observer_eval").map((f: any) => f.id));

  const relevantRoundIds = assignments.map((a: any) => a.round_id);
  const { data: responses } = await supabase
    .from("simulation_responses")
    .select("round_id, score, form_id, submitted_at")
    .in("round_id", relevantRoundIds);

  const scores = (responses || [])
    .filter((r: any) => evalFormIds.has(r.form_id) && r.submitted_at)
    .map((r: any) => Number(r.score) || 0);
  if (!scores.length) return null;
  return Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 100) / 100;
}

async function findSoapScore(supabase: any, email: string) {
  const { data: participants } = await supabase
    .from("soap_participants")
    .select("id, room_id, participant_role, pair_position")
    .ilike("student_email", email)
    .neq("participant_role", "teacher")
    .gte("created_at", since());
  if (!participants?.length) return null;

  const roomIds = Array.from(new Set(participants.map((p: any) => p.room_id)));
  const { data: responses } = await supabase
    .from("soap_responses")
    .select("id, participant_id, target_participant_id, admin_score, ai_score, answers_json, room_id, form_id")
    .in("room_id", roomIds);
  const { data: forms } = await supabase.from("soap_forms").select("id, title, form_type, content_json, room_id").in("room_id", roomIds);

  let best: number | null = null;
  for (const participant of participants) {
    const roomResponses = (responses || []).filter((r: any) => r.room_id === participant.room_id);
    const soapResp = roomResponses.find((r: any) => !r.target_participant_id && r.participant_id === participant.id);
    const peerEval = roomResponses.find((r: any) => r.target_participant_id === participant.id);
    const evalForm = (forms || []).find((f: any) => f.room_id === participant.room_id && (f.form_type === "peer_evaluation" || f.form_type === "peer_eval" || f.title?.toLowerCase().includes("avaliação")));
    const evalFields = evalForm && Array.isArray(evalForm.content_json) ? evalForm.content_json : [];
    const score = calculateSoapStudentGrade(peerEval, soapResp, evalFields, participant.pair_position === "S");
    if (score != null && (best == null || score > best)) best = Math.round(score * 100) / 100;
  }
  return best;
}

async function findPairModuleResult(supabase: any, email: string, table: "reconciliation" | "documentation") {
  const { data: participants } = await supabase
    .from(`${table}_participants`)
    .select("id, room_id, pair_index")
    .ilike("student_email", email)
    .gte("created_at", since());
  if (!participants?.length) return { score: null, feedback: [] as string[] };

  const roomIds = Array.from(new Set(participants.map((p: any) => p.room_id)));
  const { data: responses } = await supabase
    .from(`${table}_responses`)
    .select("room_id, pair_index, form_id, admin_score, ai_score, admin_feedback, ai_feedback_json, created_at")
    .in("room_id", roomIds);
  const { data: forms } = await supabase.from(`${table}_forms`).select("id, content_json").in("room_id", roomIds);

  let best: number | null = null;
  const feedback: string[] = [];
  for (const participant of participants) {
    const resps = (responses || []).filter((r: any) => r.room_id === participant.room_id && r.pair_index === participant.pair_index);
    for (const resp of resps) {
      const score = resp.admin_score ?? resp.ai_score;
      if (score != null && (best == null || Number(score) > best)) best = Math.round(Number(score) * 100) / 100;

      if (resp.admin_feedback) {
        feedback.push(resp.admin_feedback);
      } else if (resp.ai_feedback_json && typeof resp.ai_feedback_json === "object") {
        const form = (forms || []).find((f: any) => f.id === resp.form_id);
        const fields: any[] = Array.isArray(form?.content_json) ? form.content_json : [];
        for (const [fieldId, item] of Object.entries(resp.ai_feedback_json as Record<string, any>)) {
          const label = fields.find((f) => f.id === fieldId)?.label || fieldId;
          if (item?.feedback) feedback.push(`${label}: ${item.feedback}`);
        }
      }
    }
  }
  return { score: best, feedback: feedback.slice(0, 6) };
}

async function findSimulationRealisticaResults(supabase: any, email: string) {
  const [anamnesis, soap, reconciliation, documentation] = await Promise.all([
    findAnamnesisScore(supabase, email),
    findSoapScore(supabase, email),
    findPairModuleResult(supabase, email, "reconciliation"),
    findPairModuleResult(supabase, email, "documentation"),
  ]);

  const scores = [anamnesis, soap, reconciliation.score, documentation.score];
  if (scores.every((s) => s == null)) return null;

  const total = scores.reduce((sum: number, s) => sum + (s ?? 0), 0);
  const media = Math.round((total / 4) * 100) / 100;

  return {
    anamnese: anamnesis,
    soap,
    reconciliacao: reconciliation.score,
    reconciliacao_pontos_de_melhoria: reconciliation.feedback,
    documentacao: documentation.score,
    documentacao_pontos_de_melhoria: documentation.feedback,
    media,
  };
}

async function findStudentPerformance(supabase: any, email: string) {
  const [provas, simulacaoRealistica] = await Promise.all([
    findExamResults(supabase, email),
    findSimulationRealisticaResults(supabase, email),
  ]);

  const encontrado = provas.length > 0 || simulacaoRealistica != null;
  return { aluno_email: email, encontrado, provas, simulacao_realistica: simulacaoRealistica };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expectedKey = Deno.env.get("WPAGENTS_API_KEY");
    const providedKey = req.headers.get("x-wpagents-key");
    if (!expectedKey || providedKey !== expectedKey) {
      return json({ error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    let email = url.searchParams.get("email");
    let code = url.searchParams.get("code");
    if (!email && req.method === "POST") {
      try {
        const body = await req.json();
        email = body?.email ?? null;
        code = body?.code ?? code;
      } catch {
        // no/invalid JSON body — email stays null, handled below
      }
    }
    email = (email || "").trim().toLowerCase();
    code = (code || "").trim();

    if (!email || !email.includes("@")) {
      return json({ error: "Parâmetro 'email' ausente ou inválido." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Step 2: a code was provided — verify it, then return results ──
    if (code) {
      const { data: pending, error: codeErr } = await supabase
        .from("wpagents_verification_codes")
        .select("id, code, expires_at, consumed_at, attempts")
        .ilike("email", email)
        .is("consumed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (codeErr) throw codeErr;

      if (!pending || new Date(pending.expires_at) < new Date()) {
        return json({
          status: "invalid_code",
          mensagem: "Não há um código válido para esse e-mail (expirado ou nunca solicitado). Peça um novo código.",
        });
      }
      if (pending.attempts >= MAX_VERIFY_ATTEMPTS) {
        return json({
          status: "too_many_attempts",
          mensagem: "Esse código foi tentado várias vezes sem sucesso. Peça um novo código.",
        });
      }
      if (pending.code !== code) {
        await supabase
          .from("wpagents_verification_codes")
          .update({ attempts: pending.attempts + 1 })
          .eq("id", pending.id);
        return json({
          status: "wrong_code",
          mensagem: "Código incorreto. Confirme o código recebido por e-mail e tente novamente.",
        });
      }

      // Correct — single-use, mark consumed so it can't be replayed.
      await supabase
        .from("wpagents_verification_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", pending.id);

      const result = await findStudentPerformance(supabase, email);
      return json({ status: "verified", ...result });
    }

    // ── Step 1: no code yet — rate-limit, generate one, e-mail it ──
    const sinceHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: countErr } = await supabase
      .from("wpagents_verification_codes")
      .select("id", { count: "exact", head: true })
      .ilike("email", email)
      .gte("created_at", sinceHour);
    if (countErr) throw countErr;
    if ((recentCount || 0) >= MAX_CODE_REQUESTS_PER_HOUR) {
      return json({
        status: "rate_limited",
        mensagem: "Muitos códigos pedidos recentemente para esse e-mail. Peça para tentar novamente em uma hora.",
      });
    }

    const newCode = generateCode();
    const { error: insertErr } = await supabase.from("wpagents_verification_codes").insert({
      email,
      code: newCode,
      expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString(),
    });
    if (insertErr) throw insertErr;

    await sendVerificationEmail(email, newCode);

    return json({
      status: "code_sent",
      mensagem: `Um código de verificação foi enviado para ${email}. Peça ao aluno o código de 6 dígitos recebido, e chame esta mesma ferramenta de novo com o e-mail e o código.`,
    });
  } catch (err) {
    console.error("student-performance error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
