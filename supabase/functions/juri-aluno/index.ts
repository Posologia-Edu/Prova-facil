// Júri Simulado, lado do ALUNO: entrada, acompanhamento da sessão e envio de formulário.
// O aluno se identifica com o código de acesso do júri (PIN) e o próprio e-mail.
// Ações:
//  - "entrar" / "estado": devolve o que o grupo do aluno pode ver (a tela chama "estado" de tempos em tempos no lugar do realtime).
//  - "enviar": grava a resposta do grupo a um formulário do papel dele, uma vez por sessão e formulário.
// Nunca devolve: guia do professor, objetivos de aprendizagem, anotações do juiz, e-mails de outros grupos,
// processos de casos de que o grupo não participa, personagens do lado adversário, formulários de outros papéis.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ATIVAS = new Set(["announcement", "prosecution", "defense", "jury_questions", "deliberation", "verdict"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, access_code, email, form_id, session_id, answers } = await req.json();
    if (!["entrar", "estado", "enviar"].includes(action)) return json({ error: "Ação inválida" }, 400);
    if (typeof access_code !== "string" || access_code.trim().length < 4 || typeof email !== "string" || !email.trim()) return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    const { data: juris } = await db.from("mock_trials").select("id, title, access_code")
      .eq("access_code", access_code.trim()).limit(1);
    let juri = juris?.[0];
    if (!juri) {
      // o código pode ter sido digitado em outra caixa
      const { data: alt } = await db.from("mock_trials").select("id, title, access_code").ilike("access_code", access_code.trim()).limit(1);
      juri = alt?.[0];
    }
    if (!juri) return json({ ok: false, motivo: "juri" });

    const { data: grupos } = await db.from("mock_trial_groups").select("id, name, group_number")
      .eq("mock_trial_id", juri.id).order("group_number");
    if (!grupos?.length) return json({ ok: false, motivo: "grupos" });

    const { data: alunos } = await db.from("mock_trial_students").select("id, group_id, student_name, student_email")
      .in("group_id", grupos.map((g: any) => g.id));
    const alvo = email.trim().toLowerCase();
    const eu = (alunos || []).find((s: any) => (s.student_email || "").trim().toLowerCase() === alvo);
    if (!eu) return json({ ok: false, motivo: "email" });

    const meuGrupo = grupos.find((g: any) => g.id === eu.group_id)!;
    const membros = (alunos || []).filter((s: any) => s.group_id === eu.group_id)
      .map((s: any) => ({ email: s.student_email || "", name: s.student_name || "" }));

    const { data: casos } = await db.from("mock_trial_cases")
      .select("id, position, case_number, title, process_content, characters_json")
      .eq("mock_trial_id", juri.id).order("position");
    const casoIds = (casos || []).map((c: any) => c.id);

    const { data: atrib } = casoIds.length
      ? await db.from("mock_trial_assignments").select("case_id, group_id, role").in("case_id", casoIds).eq("group_id", meuGrupo.id)
      : { data: [] as any[] };
    const { data: sessoes } = casoIds.length
      ? await db.from("mock_trial_sessions")
          .select("id, case_id, status, current_phase_started_at, phase_duration_seconds, is_paused, paused_remaining_seconds")
          .in("case_id", casoIds)
      : { data: [] as any[] };
    const { data: formularios } = await db.from("mock_trial_forms").select("id, target_role, title, fields_json").eq("mock_trial_id", juri.id);

    const papelDoCaso = (casoId: string) => (atrib || []).find((a: any) => a.case_id === casoId)?.role || null;

    if (action === "enviar") {
      if (typeof form_id !== "string" || typeof session_id !== "string") return json({ error: "Dados incompletos" }, 400);
      if (!answers || typeof answers !== "object" || Array.isArray(answers)) return json({ error: "Respostas inválidas" }, 400);
      if (JSON.stringify(answers).length > 500_000) return json({ error: "Resposta grande demais" }, 413);

      const sessao = (sessoes || []).find((s: any) => s.id === session_id);
      if (!sessao) return json({ error: "Sessão inválida" }, 400);
      const papel = papelDoCaso(sessao.case_id);
      if (!papel) return json({ error: "Seu grupo não participa deste processo" }, 403);
      if (!ATIVAS.has(sessao.status)) return json({ error: "A sessão não está aberta para envio" }, 409);
      const form = (formularios || []).find((f: any) => f.id === form_id);
      if (!form || form.target_role !== papel) return json({ error: "Formulário inválido para o seu papel" }, 403);

      const { data: ja } = await db.from("mock_trial_responses").select("id")
        .eq("group_id", meuGrupo.id).eq("session_id", session_id).eq("form_id", form_id).limit(1);
      if (ja?.length) return json({ ok: false, motivo: "ja_enviado" });

      const { error } = await db.from("mock_trial_responses").insert({
        form_id, session_id, group_id: meuGrupo.id,
        student_email: eu.student_email, student_name: eu.student_name,
        response_json: { ...answers, __group_members__: membros },
      });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, integrantes: membros.length });
    }

    // entrar / estado
    const casosVisiveis = (casos || []).map((c: any) => {
      const papel = papelDoCaso(c.id);
      const sessao = (sessoes || []).find((s: any) => s.case_id === c.id);
      const ativa = !!sessao && ATIVAS.has(sessao.status);
      return {
        id: c.id, position: c.position, case_number: c.case_number, title: c.title,
        // o processo só vai para quem participa dele
        process_content: papel ? c.process_content : null,
        // personagens só do lado do grupo e só com a sessão aberta
        characters_json: papel && ativa ? (Array.isArray(c.characters_json) ? c.characters_json : []).filter((ch: any) => ch?.side === papel) : [],
      };
    });

    const participaIds = casosVisiveis.filter((c: any) => papelDoCaso(c.id)).map((c: any) => c.id);
    const { data: imagens } = participaIds.length
      ? await db.from("mock_trial_case_images").select("id, case_id, slug, status, image_url, title, caption").in("case_id", participaIds)
      : { data: [] as any[] };

    const formulariosVisiveis = (formularios || []).filter((f: any) => {
      // só os formulários dos papéis que o grupo tem em algum caso
      return (atrib || []).some((a: any) => a.role === f.target_role);
    });

    const { data: respostas } = await db.from("mock_trial_responses").select("form_id, session_id").eq("group_id", meuGrupo.id);

    return json({
      ok: true,
      juri: { id: juri.id, title: juri.title },
      participante: { name: eu.student_name, email: eu.student_email },
      grupo: { id: meuGrupo.id, name: meuGrupo.name },
      integrantes: membros,
      casos: casosVisiveis,
      atribuicoes: atrib || [],
      sessoes: sessoes || [],
      formularios: formulariosVisiveis,
      imagens: imagens || [],
      enviados: (respostas || []).map((r: any) => `${r.session_id}:${r.form_id}`),
    });
  } catch (e) {
    console.error("juri-aluno error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
