import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
async function autoSubmitSession(supabase: any, sessionId: string, examId: string) {
  const { data: examQuestions } = await supabase
    .from("exam_questions")
    .select("question_id, points")
    .eq("exam_id", examId);

  const questionIds = examQuestions?.map((eq: any) => eq.question_id) || [];
  const { data: bankQuestions } = await supabase
    .from("question_bank")
    .select("id, type, content_json")
    .in("id", questionIds);

  const { data: existingAnswers } = await supabase
    .from("student_answers")
    .select("question_id, answer_text, answer_json")
    .eq("session_id", sessionId);

  const answersMap: Record<string, any> = {};
  for (const a of existingAnswers || []) {
    answersMap[a.question_id] = a;
  }

  let totalScore = 0;
  let maxScore = 0;

  for (const eq of examQuestions || []) {
    const bq = bankQuestions?.find((b: any) => b.id === eq.question_id);
    const points = Number(eq.points) || 1;
    maxScore += points;

    const ans = answersMap[eq.question_id];
    const answerJson = ans?.answer_json || {};
    const content = (bq?.content_json || {}) as Record<string, unknown>;
    const type = bq?.type || "open_ended";

    let isCorrect: boolean | null = null;
    let pointsEarned = 0;
    let gradingStatus = "pending";

    if (type === "multiple_choice" || type === "true_false") {
      let correctAnswer: string | null = null;
      if (Array.isArray(content.alternatives)) {
        const correctAlt = (content.alternatives as Array<Record<string, unknown>>).find((a: any) => a.correct);
        correctAnswer = correctAlt ? String(correctAlt.letter) : null;
      } else if (content.correct_answer) {
        correctAnswer = String(content.correct_answer);
      }
      isCorrect = correctAnswer ? String(correctAnswer) === String(answerJson?.selected) : false;
      pointsEarned = isCorrect ? points : 0;
      gradingStatus = "graded";
      totalScore += pointsEarned;
    }

    if (ans) {
      await supabase.from("student_answers").update({
        is_correct: isCorrect,
        points_earned: pointsEarned,
        max_points: points,
        grading_status: gradingStatus,
      }).eq("session_id", sessionId).eq("question_id", eq.question_id);
    } else {
      await supabase.from("student_answers").insert({
        session_id: sessionId,
        question_id: eq.question_id,
        answer_text: "",
        answer_json: {},
        is_correct: isCorrect,
        points_earned: pointsEarned,
        max_points: points,
        grading_status: gradingStatus,
      });
    }
  }

  await supabase.from("exam_sessions").update({
    status: "submitted",
    finished_at: new Date().toISOString(),
    total_score: totalScore,
    max_score: maxScore,
  }).eq("id", sessionId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { action } = body;

    // ─── VALIDATE: email + pin → check class enrollment, return session ───
    if (action === "validate") {
      const { email, pin } = body;
      if (!email || !pin) return json({ error: "Email e PIN são obrigatórios." }, 400);

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPin = pin.trim().toLowerCase();

      // Find active publication by access_code (PIN)
      const { data: pub, error: pubErr } = await supabase
        .from("exam_publications")
        .select("id, exam_id, user_id, time_limit_minutes, start_at, end_at, is_active, exams(title, class_id)")
        .eq("access_code", normalizedPin)
        .eq("is_active", true)
        .maybeSingle();

      if (pubErr || !pub) return json({ error: "Código de acesso inválido ou prova indisponível." }, 404);

      // Check time window
      const now = new Date();
      if (pub.start_at && new Date(pub.start_at) > now) return json({ error: "Esta prova ainda não está disponível." }, 403);
      if (pub.end_at && new Date(pub.end_at) < now) return json({ error: "O prazo para esta prova já expirou." }, 403);

      const exam = pub.exams as unknown as { title: string; class_id: string | null };
      if (!exam?.class_id) return json({ error: "Esta prova não está vinculada a nenhuma turma." }, 400);

      // Check if student email is registered in the class
      const { data: students, error: studentErr } = await supabase
        .from("class_students")
        .select("id, student_name, student_email")
        .eq("class_id", exam.class_id)
        .ilike("student_email", normalizedEmail)
        .limit(1);

      const student = students?.[0] || null;

      if (studentErr || !student) {
        return json({ error: "Seu e-mail não está cadastrado nesta turma. Entre em contato com seu professor." }, 403);
      }

      // Check if already has a session
      const { data: existingSession } = await supabase
        .from("exam_sessions")
        .select("id, status")
        .eq("publication_id", pub.id)
        .eq("student_email", normalizedEmail)
        .maybeSingle();

      if (existingSession) {
        if (existingSession.status === "submitted" || existingSession.status === "graded") {
          return json({ sessionId: existingSession.id, status: "finished", examTitle: exam.title });
        }

        if (existingSession.status === "blocked") {
          return json({
            error: "Sua prova foi bloqueada por violações de segurança. Aguarde o desbloqueio do professor para continuar.",
            status: "blocked",
            sessionId: existingSession.id,
            examTitle: exam.title,
          }, 403);
        }

        return json({ sessionId: existingSession.id, status: "in_progress", examTitle: exam.title });
      }

      // Check student limit for free plan (10 students per exam)
      // Get teacher's subscription status
      const teacherUserId = pub.user_id;
      let teacherIsPremium = false;

      // Check if teacher was invited as premium
      const { data: invitation } = await supabase
        .from("admin_invitations")
        .select("id")
        .eq("created_user_id", teacherUserId)
        .eq("status", "completed")
        .maybeSingle();

      if (invitation) {
        teacherIsPremium = true;
      } else {
        // Check Stripe subscription
        try {
          const Stripe = (await import("https://esm.sh/stripe@18.5.0")).default;
          const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
          if (stripeKey) {
            // Get teacher email
            const { data: teacherAuth } = await supabase.auth.admin.getUserById(teacherUserId);
            if (teacherAuth?.user?.email) {
              const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
              const customers = await stripe.customers.list({ email: teacherAuth.user.email, limit: 1 });
              if (customers.data.length > 0) {
                const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "active", limit: 1 });
                if (subs.data.length > 0) teacherIsPremium = true;
              }
            }
          }
        } catch (e) { console.warn("Stripe check failed, assuming free plan:", e); }
      }

      if (!teacherIsPremium) {
        const FREE_STUDENT_LIMIT = 10;
        const { count: sessionCount } = await supabase
          .from("exam_sessions")
          .select("id", { count: "exact", head: true })
          .eq("publication_id", pub.id);

        if (sessionCount !== null && sessionCount >= FREE_STUDENT_LIMIT) {
          return json({ error: `Esta prova atingiu o limite de ${FREE_STUDENT_LIMIT} alunos do plano gratuito do professor.` }, 403);
        }
      }

      // Create new session (student_id can be null for non-auth students)
      const { data: newSession, error: sessErr } = await supabase
        .from("exam_sessions")
        .insert({
          publication_id: pub.id,
          student_email: normalizedEmail,
          student_name: student.student_name,
          status: "in_progress",
        })
        .select("id")
        .single();

      if (sessErr) {
        console.error("Session creation error:", sessErr);
        return json({ error: "Erro ao iniciar sessão." }, 500);
      }

      return json({ sessionId: newSession.id, status: "new", examTitle: exam.title });
    }

    // ─── LOAD: get questions for a session ───
    if (action === "load") {
      const { sessionId, email } = body;
      if (!sessionId || !email) return json({ error: "Dados incompletos." }, 400);

      const normalizedEmail = email.trim().toLowerCase();

      // Verify session belongs to this email
      const { data: sess } = await supabase
        .from("exam_sessions")
        .select("*, exam_publications(exam_id, time_limit_minutes)")
        .eq("id", sessionId)
        .eq("student_email", normalizedEmail)
        .single();

      if (!sess) return json({ error: "Sessão não encontrada." }, 404);
      if (sess.status === "blocked") {
        return json({ error: "Sua prova está bloqueada aguardando liberação do professor.", status: "blocked" }, 423);
      }
      if (sess.status !== "in_progress") return json({ error: "Esta prova já foi finalizada.", status: "finished" }, 400);

      const pub = sess.exam_publications as unknown as { exam_id: string; time_limit_minutes: number };

      // Calculate remaining time
      const startedAt = new Date(sess.started_at).getTime();
      const limitMs = pub.time_limit_minutes * 60 * 1000;
      const remaining = Math.max(0, Math.floor((limitMs - (Date.now() - startedAt)) / 1000));

      // If time expired, auto-submit server-side
      if (remaining <= 0) {
        await autoSubmitSession(supabase, sessionId, pub.exam_id);
        return json({ error: "Tempo esgotado. Sua prova foi enviada automaticamente.", status: "finished" }, 400);
      }

      // Get exam title and proctoring config
      const { data: exam } = await supabase.from("exams").select("title, proctoring_config").eq("id", pub.exam_id).single();
      const proctoringConfig = (exam as any)?.proctoring_config || {};

      // Get questions
      const { data: examQuestions } = await supabase
        .from("exam_questions")
        .select("question_id, position, points, section_name")
        .eq("exam_id", pub.exam_id)
        .order("position");

      if (!examQuestions?.length) return json({ error: "Nenhuma questão encontrada." }, 404);

      const questionIds = examQuestions.map((eq) => eq.question_id);
      const { data: bankQuestions } = await supabase
        .from("question_bank")
        .select("id, type, content_json")
        .in("id", questionIds);

      let questions = examQuestions.map((eq) => {
        const bq = bankQuestions?.find((b) => b.id === eq.question_id);
        // Strip correct answer from content for security
        const content = { ...(bq?.content_json as Record<string, unknown> || {}) };
        // Don't send correct_answer to client
        delete content.correct_answer;
        if (Array.isArray(content.alternatives)) {
          content.alternatives = (content.alternatives as Array<Record<string, unknown>>).map((a) => ({
            letter: a.letter,
            text: a.text,
            image: a.image || null,
            // Don't send correct flag
          }));
        }
        return {
          id: eq.question_id,
          type: bq?.type || "open_ended",
          content_json: content,
          position: eq.position,
          points: Number(eq.points) || 1,
          section_name: eq.section_name || "Geral",
        };
      });

      // Seeded shuffling
      if (proctoringConfig.shuffleQuestions || proctoringConfig.shuffleAlternatives) {
        // Simple hash function for seeding
        const hashToInt = (str: string): number => {
          let h = 0;
          for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h + str.charCodeAt(i)) | 0;
          }
          return Math.abs(h) || 1;
        };

        const xorshift32 = (s: number): number => {
          s ^= s << 13;
          s ^= s >> 17;
          s ^= s << 5;
          return s >>> 0;
        };

        const seededShuffle = <T>(arr: T[], seed: string): T[] => {
          let s = hashToInt(seed);
          const a = [...arr];
          for (let i = a.length - 1; i > 0; i--) {
            s = xorshift32(s);
            const j = s % (i + 1);
            [a[i], a[j]] = [a[j], a[i]];
          }
          return a;
        };

        if (proctoringConfig.shuffleQuestions) {
          questions = seededShuffle(questions, sessionId);
        }

        if (proctoringConfig.shuffleAlternatives) {
          questions = questions.map(q => {
            if (q.type === "multiple_choice" && Array.isArray(q.content_json.alternatives)) {
              const shuffledAlts = seededShuffle(
                q.content_json.alternatives as Array<Record<string, unknown>>,
                sessionId + q.id
              );
              // Re-assign letters after shuffle
              const reLettered = shuffledAlts.map((alt, idx) => ({
                ...alt,
                letter: String.fromCharCode(65 + idx), // A, B, C, D...
                originalLetter: alt.letter,
              }));
              return { ...q, content_json: { ...q.content_json, alternatives: reLettered } };
            }
            return q;
          });
        }
      }

      // Get existing answers
      const { data: existingAnswers } = await supabase
        .from("student_answers")
        .select("question_id, answer_text, answer_json")
        .eq("session_id", sessionId);

      return json({
        examTitle: exam?.title || "Prova",
        timeLeft: remaining,
        questions,
        existingAnswers: existingAnswers || [],
        proctoringConfig,
      });
    }

    // ─── SAVE-PROGRESS: periodically save answers without finishing ───
    if (action === "save-progress") {
      const { sessionId, email, answers } = body;
      if (!sessionId || !email) return json({ error: "Dados incompletos." }, 400);

      const normalizedEmail = email.trim().toLowerCase();

      const { data: sess } = await supabase
        .from("exam_sessions")
        .select("id, status")
        .eq("id", sessionId)
        .eq("student_email", normalizedEmail)
        .single();

      if (!sess) return json({ error: "Sessão não encontrada." }, 404);
      if (sess.status === "blocked") {
        return json({ error: "Sua prova está bloqueada aguardando liberação do professor.", status: "blocked" }, 423);
      }
      if (sess.status !== "in_progress") return json({ error: "Prova já finalizada.", status: "finished" }, 400);

      // Upsert each answer
      for (const [questionId, ans] of Object.entries(answers || {})) {
        const a = ans as { answer_text?: string; answer_json?: Record<string, unknown> };
        const { data: existing } = await supabase
          .from("student_answers")
          .select("id")
          .eq("session_id", sessionId)
          .eq("question_id", questionId)
          .maybeSingle();

        const answerData = {
          session_id: sessionId,
          question_id: questionId,
          answer_text: a.answer_text || "",
          answer_json: a.answer_json || {},
          grading_status: "pending",
        };

        if (existing) {
          await supabase.from("student_answers").update(answerData).eq("id", existing.id);
        } else {
          await supabase.from("student_answers").insert(answerData);
        }
      }

      return json({ success: true });
    }

    // ─── SUBMIT: save answers and finish ───
    if (action === "submit") {
      const { sessionId, email, answers } = body;
      if (!sessionId || !email) return json({ error: "Dados incompletos." }, 400);

      const normalizedEmail = email.trim().toLowerCase();

      const { data: sess } = await supabase
        .from("exam_sessions")
        .select("*, exam_publications(exam_id)")
        .eq("id", sessionId)
        .eq("student_email", normalizedEmail)
        .single();

      if (!sess) return json({ error: "Sessão não encontrada." }, 404);
      if (sess.status === "blocked") {
        return json({ error: "Sua prova está bloqueada aguardando liberação do professor.", status: "blocked" }, 423);
      }

      const pub = sess.exam_publications as unknown as { exam_id: string };

      // Get questions with correct answers for grading
      const { data: examQuestions } = await supabase
        .from("exam_questions")
        .select("question_id, points")
        .eq("exam_id", pub.exam_id);

      const questionIds = examQuestions?.map((eq) => eq.question_id) || [];
      const { data: bankQuestions } = await supabase
        .from("question_bank")
        .select("id, type, content_json")
        .in("id", questionIds);

      let totalScore = 0;
      let maxScore = 0;
      const subjectiveQuestionIds: string[] = [];

      for (const eq of examQuestions || []) {
        const bq = bankQuestions?.find((b) => b.id === eq.question_id);
        const points = Number(eq.points) || 1;
        maxScore += points;

        const ans = answers?.[eq.question_id];
        const answerText = ans?.answer_text || "";
        const answerJson = ans?.answer_json || {};

        let isCorrect: boolean | null = null;
        let pointsEarned = 0;
        let gradingStatus = "pending";

        const content = (bq?.content_json || {}) as Record<string, unknown>;
        const type = bq?.type || "open_ended";

        if (type === "multiple_choice" || type === "true_false") {
          // Auto-grade
          let correctAnswer: string | null = null;
          if (Array.isArray(content.alternatives)) {
            const correctAlt = (content.alternatives as Array<Record<string, unknown>>).find((a) => a.correct);
            correctAnswer = correctAlt ? String(correctAlt.letter) : null;
          } else if (content.correct_answer) {
            correctAnswer = String(content.correct_answer);
          }
          const selected = answerJson?.selected;
          isCorrect = correctAnswer ? String(correctAnswer) === String(selected) : false;
          pointsEarned = isCorrect ? points : 0;
          gradingStatus = "graded";
          totalScore += pointsEarned;
        } else {
          subjectiveQuestionIds.push(eq.question_id);
        }

        // Upsert answer
        const { data: existing } = await supabase
          .from("student_answers")
          .select("id")
          .eq("session_id", sessionId)
          .eq("question_id", eq.question_id)
          .maybeSingle();

        const answerData = {
          session_id: sessionId,
          question_id: eq.question_id,
          answer_text: answerText,
          answer_json: answerJson,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          max_points: points,
          grading_status: gradingStatus,
        };

        if (existing) {
          await supabase.from("student_answers").update(answerData).eq("id", existing.id);
        } else {
          await supabase.from("student_answers").insert(answerData);
        }
      }

      // Update session
      await supabase.from("exam_sessions").update({
        status: "submitted",
        finished_at: new Date().toISOString(),
        total_score: totalScore,
        max_score: maxScore,
      }).eq("id", sessionId);

      // Trigger AI grading for subjective questions
      if (subjectiveQuestionIds.length > 0) {
        try {
          const gradeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/grade-exam`;
          await fetch(gradeUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ sessionId }),
          });
        } catch { console.warn("AI grading will be processed later"); }
      }

      return json({ success: true, totalScore, maxScore });
    }

    // ─── RESULTS: get results for a finished session ───
    if (action === "results") {
      const { sessionId, email } = body;
      if (!sessionId || !email) return json({ error: "Dados incompletos." }, 400);

      const normalizedEmail = email.trim().toLowerCase();

      const { data: sess } = await supabase
        .from("exam_sessions")
        .select("*, exam_publications(exam_id)")
        .eq("id", sessionId)
        .eq("student_email", normalizedEmail)
        .single();

      if (!sess) return json({ error: "Sessão não encontrada." }, 404);

      const pub = sess.exam_publications as unknown as { exam_id: string };
      const { data: exam } = await supabase.from("exams").select("title").eq("id", pub.exam_id).single();

      const { data: answers } = await supabase
        .from("student_answers")
        .select("*, question_bank(type, content_json)")
        .eq("session_id", sessionId)
        .order("created_at");

      return json({
        examTitle: exam?.title || "Prova",
        session: {
          status: sess.status,
          total_score: sess.total_score,
          max_score: sess.max_score,
          started_at: sess.started_at,
          finished_at: sess.finished_at,
        },
        answers: answers || [],
      });
    }

    // ─── CLEANUP-EXPIRED: auto-submit all expired sessions for a publication ───
    if (action === "cleanup-expired") {
      const { publicationId } = body;
      if (!publicationId) return json({ error: "publicationId obrigatório." }, 400);

      const { data: pub } = await supabase
        .from("exam_publications")
        .select("id, exam_id, time_limit_minutes")
        .eq("id", publicationId)
        .single();

      if (!pub) return json({ error: "Publicação não encontrada." }, 404);

      const { data: sessions } = await supabase
        .from("exam_sessions")
        .select("id, started_at")
        .eq("publication_id", publicationId)
        .eq("status", "in_progress");

      let closedCount = 0;
      for (const sess of sessions || []) {
        const startedAt = new Date(sess.started_at).getTime();
        const limitMs = pub.time_limit_minutes * 60 * 1000;
        const remaining = Math.floor((limitMs - (Date.now() - startedAt)) / 1000);
        if (remaining <= 0) {
          await autoSubmitSession(supabase, sess.id, pub.exam_id);
          closedCount++;
        }
      }

      return json({ success: true, closedCount });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (err) {
    console.error("Error:", err);
    return json({ error: "Erro interno." }, 500);
  }
});
