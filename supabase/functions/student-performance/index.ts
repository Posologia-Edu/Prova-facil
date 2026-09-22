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
// Unlike the simulador repo, "results" here spans four very different
// shapes (see findStudentPerformance below):
//   - `provas`: traditional exams (exam_sessions/student_answers), the
//     closest analog to the simulador's MC-question review — per-question
//     correct/incorrect + points.
//   - `simulacao_realistica`: the "Agregador de Notas" join across the 4
//     pharmacy-simulation modules (Anamnese/SOAP/Reconciliação/
//     Documentação), ported here from src/pages/SimulationAggregator.tsx
//     (a client-only React component with no server-side equivalent before
//     this) — AI-graded, rubric/field-based feedback rather than fixed
//     right/wrong questions.
//   - `pacientes_virtuais`: the AI-patient anamnese/MAI exercise (a group of
//     students interviews an AI-role-played patient; ProvaFácil's own AI
//     grades the group on a 10-item rubric + safety flags), ported from
//     src/pages/VirtualPatientFeedback.tsx (student-facing) and
//     src/pages/VPAnalytics.tsx (teacher grading UI) — a completely
//     separate module/table set from `simulacao_realistica` above despite
//     both involving an "anamnese", first added here after a student's own
//     virtual-patient result came back "not found" even though it had been
//     graded, because this module simply had no query at all.
//   - `juri_simulado`: a mock-trial team activity — a group of students is
//     assigned a role (prosecution/defense/jury) per case, and the *group*
//     is graded, not the individual. Ported from
//     src/components/mock-trial/StudentScoresPanel.tsx (the teacher's own
//     per-student gradebook — the only place in this app that already
//     resolves a group grade down to an individual student) including its
//     attendance override rule (absent -> 0, excused -> dropped from the
//     average, a manual per-student override replaces the group score).
//     Unlike the other three modules, this app has no student-facing "your
//     result" page at all for this one — src/pages/MockTrialStudent.tsx only
//     lets a student participate (read the case, submit forms), never see a
//     grade — so this is the first "your Júri Simulado result" view for a
//     student anywhere, and there's no release gate to mirror since none
//     exists yet in the app itself.
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

// A test/instructor account can rack up many exam sessions over a semester —
// the sibling TBL repo hit this live (11 rooms in one payload made the
// caller's own LLM tool-result call time out even at 60s, and would have
// produced an unreadable wall of text on WhatsApp regardless). Default to
// just the single most recent exam; a student who wants an older one can
// name it via the optional `prova` argument, after being told (via
// mais_provas_disponiveis, below) which other exams exist.
const MAX_EXAM_SESSIONS = 10;
const DEFAULT_EXAM_LIMIT = 1;
// Bounds the SOAP/reconciliation/documentation/anamnese/virtual-patient
// scans below to recent rooms, so this doesn't grow unbounded as rooms
// accumulate over semesters/years.
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

type ExamResults = {
  provas: any[];
  mais_provas_disponiveis?: { titulo: string; data: string }[];
  prova_nao_encontrada?: string;
  provas_disponiveis?: string[];
};

async function findExamResults(supabase: any, email: string, examFilter?: string | null): Promise<ExamResults> {
  const { data: sessions, error: sessErr } = await supabase
    .from("exam_sessions")
    .select("id, publication_id, total_score, max_score, status, finished_at")
    .eq("student_email", email)
    .in("status", ["submitted", "graded"])
    .order("finished_at", { ascending: false })
    .limit(MAX_EXAM_SESSIONS);
  if (sessErr) throw sessErr;
  if (!sessions?.length) return { provas: [] };

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
  const titleForSession = (sess: any): string => String(examTitleById.get(examIdByPubId.get(sess.publication_id)) || "Prova");

  // A test/instructor account can pile up many exam sessions — default to
  // the single most recent one so this (and the LLM call that reads it)
  // doesn't blow up on a heavy account; a student can ask for an older one
  // by title via the optional `prova` argument.
  let selectedSessions = sessions;
  let maisProvasDisponiveis: { titulo: string; data: string }[] = [];
  if (examFilter) {
    const matched = sessions.filter((s: any) => titleForSession(s).toLowerCase().includes(examFilter.toLowerCase()));
    if (matched.length === 0) {
      return {
        provas: [],
        prova_nao_encontrada: examFilter,
        provas_disponiveis: sessions.map((s: any) => titleForSession(s)),
      };
    }
    selectedSessions = matched;
  } else if (sessions.length > DEFAULT_EXAM_LIMIT) {
    maisProvasDisponiveis = sessions.slice(DEFAULT_EXAM_LIMIT).map((s: any) => ({ titulo: titleForSession(s), data: s.finished_at }));
    selectedSessions = sessions.slice(0, DEFAULT_EXAM_LIMIT);
  }

  const sessionIds = selectedSessions.map((s: any) => s.id);
  const { data: answers, error: ansErr } = await supabase
    .from("student_answers")
    .select("session_id, question_id, answer_text, answer_json, is_correct, points_earned, max_points, grading_status, ai_score, ai_feedback, teacher_score, teacher_feedback, question_bank(type, content_json)")
    .in("session_id", sessionIds);
  if (ansErr) throw ansErr;

  const provas = selectedSessions.map((sess: any) => {
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

  return {
    provas,
    ...(maisProvasDisponiveis.length ? { mais_provas_disponiveis: maisProvasDisponiveis } : {}),
  };
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

// ─────────────────────────────────────────────────────────────────────────
// Pacientes Virtuais (VP) — a group of students interviews an AI-role-played
// patient; ProvaFácil's own AI grades the shared encounter on a 10-item
// rubric (6 "Anamnese" items + 4 "MAI" — Medication Appropriateness Index —
// items) plus a clinical-efficiency bonus and free-text safety flags.
// Ported from src/pages/VirtualPatientFeedback.tsx (the student-facing
// feedback page) — including its group-fallback and release-gating rules,
// which matter here just as much as they do for a student browsing the app:
//   - A case is graded once per group, but each member has their own
//     `virtual_patient_sessions` row. If a member's own session has no
//     grade (or an unreleased one), fall back to a sibling session's
//     *released* grade — same rule the student portal itself applies via
//     src/pages/VirtualPatientFeedback.tsx:87-104.
//   - `feedback_released` gates visibility (also enforced by an RLS policy
//     on virtual_patient_grades) — a professor reviews the AI's grading
//     before releasing it, so an ungraded or not-yet-released case must
//     stay invisible here too, not just "not found".
// ─────────────────────────────────────────────────────────────────────────

// Built-in catalog, mirrored from the VP_CATALOG constant in
// src/pages/VPAnalytics.tsx and src/pages/Classes.tsx (no shared module to
// import from a Deno edge function). Falls back to custom_virtual_patients
// (teacher-authored patients) for any patient_id not found here.
const VP_PATIENT_NAMES: Record<string, string> = {
  pain_helena: "Dona Helena, 67 anos",
  pain_luciana: "Luciana, 42 anos",
  pain_rogerio: "Rogério, 58 anos",
  pain_pedro: "Pedro, 65 anos",
  pain_ana: "Ana, 36 anos",
  inflammation_maria: "Dona Maria, 72 anos",
  inflammation_antonio: "Seu Antônio, 66 anos",
  inflammation_renata: "Renata, 39 anos",
  inflammation_wilson: "Seu Wilson, 57 anos",
  inflammation_jose: "José, 57 anos",
};

const VP_SUBSCORE_LABELS: Record<string, string> = {
  identificacao_acolhimento: "Acolhimento",
  queixa_principal_hda: "Queixa principal / HDA",
  historia_medicamentosa: "História medicamentosa",
  antecedentes_comorbidades: "Antecedentes / comorbidades",
  habitos_estilo_vida: "Hábitos e estilo de vida",
  escuta_raciocinio_clinico: "Escuta e raciocínio clínico",
  mai_completude: "MAI - completude",
  mai_coerencia_clinica: "MAI - coerência clínica",
  mai_justificativa_critica: "MAI - crítica/justificativa",
  mai_seguranca_paciente: "MAI - segurança do paciente",
};
const VP_ANAMNESE_KEYS = Object.keys(VP_SUBSCORE_LABELS).slice(0, 6);
const VP_MAI_KEYS = Object.keys(VP_SUBSCORE_LABELS).slice(6);

// Verbatim port of src/pages/VirtualPatientFeedback.tsx's microBonus/finalWithBonus.
const vpMicroBonus = (m: number | null | undefined) => Math.max(0, Math.min(1, (Number(m) || 0) / 5));
const vpFinalWithBonus = (base: number | null | undefined, m: number | null | undefined) =>
  Math.round(Math.min(10, Math.max(0, (Number(base) || 0) + vpMicroBonus(m))) * 100) / 100;

async function findVirtualPatientResults(supabase: any, email: string) {
  const { data: sessions } = await supabase
    .from("virtual_patient_sessions")
    .select("id, class_virtual_patient_id, patient_id, group_id, created_at")
    .ilike("student_email", email)
    .gte("created_at", since())
    .order("created_at", { ascending: false });
  if (!sessions?.length) return [];

  const cvpIds = Array.from(new Set(sessions.map((s: any) => s.class_virtual_patient_id).filter(Boolean)));
  const { data: cvps } = cvpIds.length
    ? await supabase.from("class_virtual_patients").select("id, group_label").in("id", cvpIds)
    : { data: [] };
  const cvpLabelMap = new Map((cvps || []).map((c: any) => [c.id, c.group_label || null]));

  // Group-fallback needs every sibling session in the group, not just this
  // student's own — batched here across all of this student's cases at once.
  const groupIds = Array.from(new Set(sessions.filter((s: any) => s.group_id).map((s: any) => s.group_id)));
  const { data: siblingSessions } = groupIds.length
    ? await supabase.from("virtual_patient_sessions").select("id, group_id").in("group_id", groupIds)
    : { data: [] };

  const sessionIdsForGrades = Array.from(new Set([
    ...sessions.map((s: any) => s.id),
    ...(siblingSessions || []).map((s: any) => s.id),
  ]));
  const { data: grades } = sessionIdsForGrades.length
    ? await supabase
        .from("virtual_patient_grades")
        .select("session_id, subscores, bonus_penalidades, nota_final, nota_microlearning, feedback_resumido, orientacoes_melhoria, flags_seguranca, feedback_released")
        .in("session_id", sessionIdsForGrades)
    : { data: [] };
  const gradeBySession = new Map<string, any>((grades || []).map((g: any) => [g.session_id, g]));

  // Resolve display names for any patient_id missing from the built-in
  // catalog (a teacher-authored custom_virtual_patients row).
  const unknownPatientIds = Array.from(new Set(
    sessions.map((s: any) => s.patient_id).filter((id: string) => id && !VP_PATIENT_NAMES[id])
  ));
  const { data: customPatients } = unknownPatientIds.length
    ? await supabase.from("custom_virtual_patients").select("id, name").in("id", unknownPatientIds)
    : { data: [] };
  const customNameMap = new Map((customPatients || []).map((p: any) => [p.id, p.name]));
  const patientName = (id: string) => VP_PATIENT_NAMES[id] || customNameMap.get(id) || id;

  return sessions.map((session: any) => {
    let grade = gradeBySession.get(session.id);
    if ((!grade || !grade.feedback_released) && session.group_id) {
      const released = (siblingSessions || [])
        .filter((s: any) => s.group_id === session.group_id)
        .map((s: any) => gradeBySession.get(s.id))
        .find((g: any) => g?.feedback_released);
      if (released) grade = released;
    }

    if (!grade) {
      return { paciente: patientName(session.patient_id), data: session.created_at, status: "aguardando_correcao" };
    }
    if (!grade.feedback_released) {
      return { paciente: patientName(session.patient_id), data: session.created_at, status: "corrigido_aguardando_liberacao_do_professor" };
    }

    const subs = grade.subscores || {};
    const anamnese = Object.fromEntries(VP_ANAMNESE_KEYS.map((k) => [VP_SUBSCORE_LABELS[k], Number(subs[k]) || 0]));
    const mai = Object.fromEntries(VP_MAI_KEYS.map((k) => [VP_SUBSCORE_LABELS[k], Number(subs[k]) || 0]));

    return {
      paciente: patientName(session.patient_id),
      grupo: cvpLabelMap.get(session.class_virtual_patient_id) || null,
      status: "corrigido",
      data: session.created_at,
      nota_final: vpFinalWithBonus(grade.nota_final, grade.nota_microlearning),
      nota_base_sem_bonus: grade.nota_final,
      eficiencia_clinica: grade.nota_microlearning,
      anamnese_por_item_0_a_1: anamnese,
      mai_por_item_0_a_1: mai,
      bonus_penalidades: grade.bonus_penalidades || null,
      flags_seguranca: Array.isArray(grade.flags_seguranca) ? grade.flags_seguranca : [],
      feedback_resumido: grade.feedback_resumido || null,
      orientacoes_melhoria: grade.orientacoes_melhoria || null,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Júri Simulado (mock trial) — see the file-header comment for the module
// overview. Grading is per (group, case): mock_trial_assignments says which
// role a group played in which case; mock_trial_evaluations holds the actual
// scores, keyed by group_id+case_id+evaluator_type (never by student).
// ─────────────────────────────────────────────────────────────────────────

const MT_ROLE_LABELS: Record<string, string> = {
  prosecution: "Acusação",
  defense: "Defesa",
  jury: "Júri Técnico",
};

// Verbatim port of src/lib/mock-trial-evaluations.ts's consolidateScores,
// specialized to a single (group, case) pair instead of a whole case's
// assignment list.
function consolidateMockTrialScore(evals: any[]) {
  const parts: number[] = [];
  const feedbacks: string[] = [];
  for (const type of ["judge", "teacher", "ai_jury"]) {
    const ev = evals.find((e: any) => e.evaluator_type === type);
    if (ev?.score != null && !Number.isNaN(Number(ev.score))) parts.push(Number(ev.score));
    if (ev?.feedback) feedbacks.push(ev.feedback);
  }
  return {
    score: parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) / 100 : null,
    feedbacks,
  };
}

async function findJuriSimuladoResults(supabase: any, email: string) {
  const { data: students } = await supabase
    .from("mock_trial_students")
    .select("id, group_id, created_at")
    .ilike("student_email", email)
    .order("created_at", { ascending: false });
  if (!students?.length) return { juri_simulado: [] };

  const groupIds = Array.from(new Set(students.map((s: any) => s.group_id)));
  const { data: groups } = await supabase.from("mock_trial_groups").select("id, name, mock_trial_id").in("id", groupIds);
  const groupById = new Map((groups || []).map((g: any) => [g.id, g]));

  const trialIds = Array.from(new Set((groups || []).map((g: any) => g.mock_trial_id)));
  const { data: trials } = trialIds.length
    ? await supabase.from("mock_trials").select("id, title").in("id", trialIds)
    : { data: [] };
  const trialById = new Map((trials || []).map((t: any) => [t.id, t]));

  // One membership per (student row, trial); a student normally has exactly
  // one mock_trial_students row per trial they joined. Kept in the
  // already-newest-first order from the query above.
  const seenTrials = new Set<string>();
  const memberships: { student: any; group: any; trial: any }[] = [];
  for (const s of students) {
    const group = groupById.get(s.group_id);
    const trial = group ? trialById.get(group.mock_trial_id) : null;
    if (!trial || seenTrials.has(trial.id)) continue;
    seenTrials.add(trial.id);
    memberships.push({ student: s, group, trial });
  }
  if (!memberships.length) return { juri_simulado: [] };

  // Same "heavy account -> only the most recent, list the rest by name" cap
  // used everywhere else in this file.
  const maisJurisDisponiveis = memberships.slice(1).map((m) => ({ titulo: m.trial.title }));
  const selected = memberships[0];

  const { data: cases } = await supabase
    .from("mock_trial_cases")
    .select("id, title, case_number, position")
    .eq("mock_trial_id", selected.trial.id)
    .order("position");
  const caseIds = (cases || []).map((c: any) => c.id);
  if (!caseIds.length) {
    return { juri_simulado: [{ juri: selected.trial.title, grupo: selected.group?.name || null, media: null, processos: [] }] };
  }

  const { data: assignments } = await supabase
    .from("mock_trial_assignments")
    .select("case_id, group_id, role")
    .in("case_id", caseIds)
    .eq("group_id", selected.student.group_id);
  if (!assignments?.length) {
    return { juri_simulado: [{ juri: selected.trial.title, grupo: selected.group?.name || null, media: null, processos: [] }] };
  }

  const { data: evaluations } = await supabase
    .from("mock_trial_evaluations")
    .select("case_id, group_id, evaluator_type, evaluated_role, score, feedback")
    .in("case_id", caseIds)
    .eq("group_id", selected.student.group_id);

  const { data: attendance } = await supabase
    .from("mock_trial_attendance")
    .select("case_id, status, score_override, notes")
    .eq("student_id", selected.student.id)
    .in("case_id", caseIds);
  const attendanceByCase = new Map((attendance || []).map((a: any) => [a.case_id, a]));

  const processos = assignments.map((assign: any) => {
    const caseInfo = (cases || []).find((c: any) => c.id === assign.case_id);
    const caseEvals = (evaluations || []).filter((e: any) => e.case_id === assign.case_id);

    let rawScore: number | null = null;
    let feedbacks: string[] = [];
    if (assign.role === "prosecution" || assign.role === "defense") {
      const consolidated = consolidateMockTrialScore(caseEvals);
      rawScore = consolidated.score;
      feedbacks = consolidated.feedbacks;
    } else if (assign.role === "jury") {
      const ev = caseEvals.find((e: any) => e.evaluator_type === "ai_jury_panel" && e.evaluated_role === "jury");
      rawScore = ev?.score != null ? Number(ev.score) : null;
      if (ev?.feedback) feedbacks.push(ev.feedback);
    }

    const att = attendanceByCase.get(assign.case_id);
    const status = att?.status || "present";
    let notaFinal: number | null;
    let contaNaMedia = true;
    if (status === "absent") {
      notaFinal = 0;
    } else if (status === "excused") {
      notaFinal = null;
      contaNaMedia = false;
    } else {
      notaFinal = att?.score_override != null ? Number(att.score_override) : rawScore;
    }

    return {
      processo: caseInfo?.title || caseInfo?.case_number || "Processo",
      papel: MT_ROLE_LABELS[assign.role] || assign.role,
      status_presenca: status === "absent" ? "faltou" : status === "excused" ? "nao_participou" : "presente",
      nota_do_grupo: rawScore,
      nota_final: notaFinal,
      conta_na_media: contaNaMedia,
      observacoes_professor: att?.notes || null,
      feedback: feedbacks.length ? feedbacks.join("\n\n") : null,
    };
  });

  const counted = processos.filter((p: any) => p.conta_na_media && p.nota_final != null).map((p: any) => p.nota_final as number);
  const media = counted.length ? Math.round((counted.reduce((a: number, b: number) => a + b, 0) / counted.length) * 100) / 100 : null;

  return {
    juri_simulado: [{ juri: selected.trial.title, grupo: selected.group?.name || null, media, processos }],
    ...(maisJurisDisponiveis.length ? { mais_juris_disponiveis: maisJurisDisponiveis } : {}),
  };
}

async function findStudentPerformance(supabase: any, email: string, provaFilter?: string | null) {
  const [examResult, simulacaoRealistica, pacientesVirtuais, juriResult] = await Promise.all([
    findExamResults(supabase, email, provaFilter),
    findSimulationRealisticaResults(supabase, email),
    findVirtualPatientResults(supabase, email),
    findJuriSimuladoResults(supabase, email),
  ]);

  const encontrado =
    examResult.provas.length > 0 ||
    simulacaoRealistica != null ||
    pacientesVirtuais.length > 0 ||
    juriResult.juri_simulado.length > 0 ||
    !!examResult.prova_nao_encontrada;
  return {
    aluno_email: email,
    encontrado,
    provas: examResult.provas,
    simulacao_realistica: simulacaoRealistica,
    pacientes_virtuais: pacientesVirtuais,
    juri_simulado: juriResult.juri_simulado,
    ...(examResult.mais_provas_disponiveis ? { mais_provas_disponiveis: examResult.mais_provas_disponiveis } : {}),
    ...(examResult.prova_nao_encontrada ? { prova_nao_encontrada: examResult.prova_nao_encontrada, provas_disponiveis: examResult.provas_disponiveis } : {}),
    ...(juriResult.mais_juris_disponiveis ? { mais_juris_disponiveis: juriResult.mais_juris_disponiveis } : {}),
  };
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
    let prova = url.searchParams.get("prova");
    if (!email && req.method === "POST") {
      try {
        const body = await req.json();
        email = body?.email ?? null;
        code = body?.code ?? code;
        prova = body?.prova ?? prova;
      } catch {
        // no/invalid JSON body — email stays null, handled below
      }
    }
    email = (email || "").trim().toLowerCase();
    code = (code || "").trim();
    prova = (prova || "").trim() || null;

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

      const result = await findStudentPerformance(supabase, email, prova);
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
