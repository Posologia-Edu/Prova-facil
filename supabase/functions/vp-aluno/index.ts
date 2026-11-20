// Paciente Virtual, lado do ALUNO (sala e feedback). O aluno se identifica com o PIN da sala e o próprio e-mail.
// Substitui as leituras e gravações diretas que as telas VirtualPatientRoom, RecordPanel, VirtualPatientMAI e VirtualPatientFeedback
// faziam nas tabelas virtual_patient_* e class_virtual_patients.
// Ações:
//  sala            dados da sala (paciente, modo, funções do grupo), sem criar sessão
//  entrar          abre a sala: acha ou cria a(s) sessão(ões), devolve mensagens, encontro, consentimento e dados da sala
//  estado          consulta periódica (no lugar do realtime): mensagens novas, encontro, status e funções do grupo
//  mensagem        grava uma mensagem do chat na sessão primária
//  avancar         passa para o encontro seguinte (em todas as sessões do grupo)
//  consentimento   registra o consentimento de pesquisa (em todas as sessões do grupo)
//  funcoes_salvar  grava quem registra a ficha em um encontro
//  ficha_ler / ficha_salvar   seções da ficha eletrônica
//  mai             grava o MAI e conclui a sessão
//  espelhar_nota   copia a nota da sessão primária para as demais do grupo
//  feedback        nota liberada, MAI e conversa para a tela de feedback
// O grupo é decidido aqui: as sessões do aluno e o group_id gravado nelas; a lista de e-mails enviada pelo navegador só vale se todos
// estiverem na turma da sala.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const norm = (s: unknown) => (typeof s === "string" ? s.trim().toLowerCase() : "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACOES = ["sala", "entrar", "estado", "mensagem", "avancar", "consentimento", "funcoes_salvar", "ficha_ler", "ficha_salvar", "mai", "espelhar_nota", "feedback"];
const MSG_COLS = "id, role, content, encounter, author_name, author_email, created_at";

// deno-lint-ignore no-explicit-any
type Db = any;

async function contexto(db: Db, b: any) {
  if (typeof b.cvp_id !== "string" || !UUID.test(b.cvp_id) || typeof b.pin !== "string" || b.pin.trim().length < 4) return { erro: "Dados incompletos" };
  const email = norm(b.email);
  if (!email) return { erro: "Dados incompletos" };
  const { data: cvp } = await db.from("class_virtual_patients")
    .select("id, class_id, patient_id, access_code, status, group_roles, mode, dificuldade").eq("id", b.cvp_id).maybeSingle();
  if (!cvp || norm(cvp.access_code) !== norm(b.pin)) return { semAcesso: "sala" };
  const { data: turma } = await db.from("class_students").select("student_name, student_email").eq("class_id", cvp.class_id);
  const roster = (turma || []).map((s: any) => ({ email: norm(s.student_email), name: s.student_name || "" }));
  const eu = roster.find((s: any) => s.email === email);
  if (!eu) return { semAcesso: "email" };
  return { db, cvp, roster, email, eu };
}

// A sessão pedida precisa ser a do próprio aluno ou a de um colega do mesmo grupo
async function autoriza(c: any, sessionId: unknown) {
  if (typeof sessionId !== "string" || !UUID.test(sessionId)) return null;
  const { data: minhas } = await c.db.from("virtual_patient_sessions")
    .select("id, group_id, student_email, current_encounter, status, created_at")
    .eq("class_virtual_patient_id", c.cvp.id).eq("student_email", c.email).order("created_at", { ascending: true }).limit(1);
  const propria = minhas?.[0];
  if (!propria) return null;
  const { data: alvos } = await c.db.from("virtual_patient_sessions")
    .select("id, group_id, student_email, current_encounter, status, class_virtual_patient_id").eq("id", sessionId).limit(1);
  const alvo = alvos?.[0];
  if (!alvo || alvo.class_virtual_patient_id !== c.cvp.id) return null;
  if (alvo.id !== propria.id && !(propria.group_id && alvo.group_id === propria.group_id)) return null;
  let irmas: string[] = [propria.id];
  if (propria.group_id) {
    const { data: g } = await c.db.from("virtual_patient_sessions").select("id").eq("class_virtual_patient_id", c.cvp.id).eq("group_id", propria.group_id);
    irmas = (g || []).map((s: any) => s.id);
  }
  return { propria, alvo, irmas };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const b = await req.json();
    const action = b.action;
    if (!ACOES.includes(action)) return json({ error: "Ação inválida" }, 400);
    const db = adminClient();
    const c: any = await contexto(db, b);
    if (c.erro) return json({ error: c.erro }, 400);
    if (c.semAcesso) return json({ ok: false, motivo: c.semAcesso });

    const salaPub = { id: c.cvp.id, patient_id: c.cvp.patient_id, access_code: c.cvp.access_code, group_roles: !!c.cvp.group_roles, mode: c.cvp.mode || "avaliativo", dificuldade: c.cvp.dificuldade ?? null };
    if (action === "sala") return json({ ok: true, sala: salaPub, nome: c.eu.name });

    // ---------- entrar ----------
    if (action === "entrar") {
      const modulo = typeof b.module === "string" && b.module.trim() ? b.module.trim().slice(0, 40) : "pain";
      let emailsGrupo: string[] = (Array.isArray(b.group_emails) ? b.group_emails : []).map(norm).filter(Boolean);
      emailsGrupo = [...new Set(emailsGrupo)].slice(0, 12);
      const ehGrupo = emailsGrupo.length > 1;
      if (ehGrupo) {
        if (!emailsGrupo.includes(c.email)) return json({ ok: false, motivo: "grupo" });
        if (emailsGrupo.some((e) => !c.roster.some((r: any) => r.email === e))) return json({ ok: false, motivo: "grupo" });
      }
      const nomeDe = (e: string) => c.roster.find((r: any) => r.email === e)?.name || "";
      let sessionIds: string[] = [];
      let primaria: any = null;
      let grupoId: string | null = null;

      if (ehGrupo) {
        const { data: existentes } = await db.from("virtual_patient_sessions")
          .select("id, group_id, student_email, current_encounter, status, created_at")
          .eq("class_virtual_patient_id", c.cvp.id).in("student_email", emailsGrupo).order("created_at", { ascending: true });
        grupoId = (existentes || []).find((s: any) => s.group_id)?.group_id || crypto.randomUUID();
        const porEmail = new Map<string, any>();
        (existentes || []).forEach((s: any) => porEmail.set(s.student_email, s));
        const linhas: any[] = [];
        for (const em of emailsGrupo) {
          const ja = porEmail.get(em);
          if (ja) {
            if (!ja.group_id) await db.from("virtual_patient_sessions").update({ group_id: grupoId }).eq("id", ja.id);
            linhas.push(ja);
          } else {
            const { data: nova, error } = await db.from("virtual_patient_sessions").insert({
              patient_id: c.cvp.patient_id, module: modulo, class_virtual_patient_id: c.cvp.id,
              student_email: em, student_name: nomeDe(em), group_id: grupoId,
            }).select("id, created_at, current_encounter, status").single();
            if (error || !nova) { console.error("sessão do grupo:", error); continue; }
            linhas.push(nova);
          }
        }
        linhas.sort((x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime());
        primaria = linhas[0];
        sessionIds = linhas.map((s) => s.id);
      } else {
        const { data: ex } = await db.from("virtual_patient_sessions")
          .select("id, group_id, current_encounter, status, created_at")
          .eq("class_virtual_patient_id", c.cvp.id).eq("student_email", c.email).order("created_at", { ascending: true }).limit(1);
        primaria = ex?.[0];
        if (primaria?.group_id) {
          // já pertence a um grupo desta sala: reconstrói o grupo pelas sessões existentes
          const { data: ir } = await db.from("virtual_patient_sessions")
            .select("id, student_email, student_name, created_at, current_encounter, status")
            .eq("class_virtual_patient_id", c.cvp.id).eq("group_id", primaria.group_id).order("created_at", { ascending: true });
          grupoId = primaria.group_id;
          sessionIds = (ir || []).map((s: any) => s.id);
          emailsGrupo = (ir || []).map((s: any) => norm(s.student_email));
          primaria = ir?.[0] || primaria;
        } else if (!primaria) {
          const { data: nova, error } = await db.from("virtual_patient_sessions").insert({
            patient_id: c.cvp.patient_id, module: modulo, class_virtual_patient_id: c.cvp.id,
            student_email: c.email, student_name: c.eu.name,
          }).select("id, current_encounter, status, created_at").single();
          if (error || !nova) return json({ error: "Erro ao criar sessão." }, 500);
          primaria = nova;
          sessionIds = [nova.id];
        } else sessionIds = [primaria.id];
      }
      if (!primaria) return json({ error: "Erro ao criar sessão." }, 500);

      const { data: msgs } = await db.from("virtual_patient_messages").select(MSG_COLS).eq("session_id", primaria.id).order("created_at", { ascending: true });
      const { data: cons } = await db.from("virtual_patient_sessions").select("research_consent").eq("id", primaria.id).maybeSingle();
      const grupoEmails = grupoId ? emailsGrupo : [];
      return json({
        ok: true,
        sala: salaPub,
        nome: c.eu.name,
        grupo: grupoId && grupoEmails.length > 1
          ? { id: grupoId, emails: grupoEmails, nomes: grupoEmails.map(nomeDe), sessionIds }
          : null,
        sessionId: primaria.id,
        encounter: primaria.current_encounter || 1,
        completed: primaria.status === "completed",
        messages: msgs || [],
        consent: cons?.research_consent ?? null,
      });
    }

    // ---------- feedback (não usa session_id: acha a sessão pelo e-mail) ----------
    if (action === "feedback") {
      const { data: ss } = await db.from("virtual_patient_sessions")
        .select("id, student_name, group_id, patient_id").eq("class_virtual_patient_id", c.cvp.id).eq("student_email", c.email).limit(1);
      const sessao = ss?.[0];
      if (!sessao) return json({ ok: false, motivo: "sem_sessao" });
      const GRADE = "id, session_id, subscores, bonus_penalidades, nota_final, nota_microlearning, feedback_resumido, orientacoes_melhoria, flags_seguranca, feedback_released";
      let primariaId = sessao.id;
      let { data: g } = await db.from("virtual_patient_grades").select(GRADE).eq("session_id", sessao.id).maybeSingle();
      if (!g?.feedback_released && sessao.group_id) {
        const { data: irm } = await db.from("virtual_patient_sessions").select("id, created_at").eq("group_id", sessao.group_id).eq("class_virtual_patient_id", c.cvp.id).order("created_at", { ascending: true });
        const ids = (irm || []).map((s: any) => s.id);
        if (ids.length) {
          const { data: gg } = await db.from("virtual_patient_grades").select(GRADE).in("session_id", ids);
          const liberada = (gg || []).find((x: any) => x.feedback_released);
          if (liberada) g = liberada;
          primariaId = irm?.[0]?.id || sessao.id;
        }
      }
      const base = { ok: true, modo: { mode: c.cvp.mode || "avaliativo", dificuldade: c.cvp.dificuldade ?? null }, sessao: { id: sessao.id, student_name: sessao.student_name, group_id: sessao.group_id, patient_id: sessao.patient_id } };
      // Nota ainda não liberada: o aluno não recebe nada dela
      if (!g || !g.feedback_released) return json({ ...base, grade: null, mai: null, transcript: [] });
      const { data: mai } = await db.from("virtual_patient_mai_scores").select("mai_json").eq("session_id", g.session_id).maybeSingle();
      const { data: msgs } = await db.from("virtual_patient_messages").select("role, content, encounter")
        .eq("session_id", sessao.group_id ? primariaId : sessao.id).order("created_at", { ascending: true });
      return json({ ...base, grade: g, mai: mai?.mai_json || null, transcript: msgs || [] });
    }

    // ---------- demais ações: exigem uma sessão do grupo ----------
    const a = await autoriza(c, b.session_id);
    if (!a) return json({ ok: false, motivo: "sessao" }, 403);
    const sid = a.alvo.id as string;

    if (action === "estado") {
      const desde = typeof b.desde === "string" && !isNaN(Date.parse(b.desde)) ? b.desde : null;
      let q = db.from("virtual_patient_messages").select(MSG_COLS).eq("session_id", sid).order("created_at", { ascending: true });
      if (desde) q = q.gte("created_at", desde);
      const { data: msgs } = await q;
      const { data: s } = await db.from("virtual_patient_sessions").select("current_encounter, status").eq("id", sid).maybeSingle();
      let funcoes: unknown = undefined;
      if (b.com_funcoes) {
        const { data } = await db.from("virtual_patient_encounter_roles").select("encounter, registrars, chosen_by").eq("session_id", sid);
        funcoes = data || [];
      }
      return json({ ok: true, messages: msgs || [], encounter: s?.current_encounter, status: s?.status, funcoes });
    }

    if (action === "mensagem") {
      const { id, encounter, role, content } = b;
      if (typeof id !== "string" || !UUID.test(id)) return json({ error: "Dados inválidos" }, 400);
      if (role !== "user" && role !== "assistant") return json({ error: "Dados inválidos" }, 400);
      if (typeof content !== "string" || !content.trim() || content.length > 30000) return json({ error: "Mensagem inválida" }, 400);
      if (!Number.isInteger(encounter) || encounter < 1 || encounter > 3) return json({ error: "Encontro inválido" }, 400);
      const linha: Record<string, unknown> = { id, session_id: sid, encounter, role, content };
      if (role === "user") { linha.author_email = c.email; linha.author_name = c.eu.name || null; }
      const { error } = await db.from("virtual_patient_messages").insert(linha);
      if (error && error.code !== "23505") return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "avancar") {
      const para = Number(b.para);
      if (!Number.isInteger(para) || para < 2 || para > 3) return json({ error: "Encontro inválido" }, 400);
      const atual = a.alvo.current_encounter || 1;
      // se outro integrante já avançou, só devolve o encontro atual
      if (atual !== para - 1) return json({ ok: true, encounter: atual, jaAvancou: true });
      const { error } = await db.from("virtual_patient_sessions").update({ current_encounter: para }).in("id", a.irmas);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, encounter: para });
    }

    if (action === "consentimento") {
      if (typeof b.accept !== "boolean") return json({ error: "Dados inválidos" }, 400);
      const { error } = await db.from("virtual_patient_sessions").update({
        research_consent: b.accept, research_consent_at: new Date().toISOString(),
        research_consent_version: typeof b.version === "string" ? b.version.slice(0, 20) : "1.0",
      }).in("id", a.irmas);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "funcoes_salvar") {
      const { encounter, registrars } = b;
      if (!Number.isInteger(encounter) || encounter < 1 || encounter > 3 || !Array.isArray(registrars)) return json({ error: "Dados inválidos" }, 400);
      const lista = [...new Set(registrars.map(norm).filter(Boolean))].slice(0, 12);
      if (lista.some((e) => !c.roster.some((r: any) => r.email === e))) return json({ error: "Integrante inválido" }, 400);
      const { error } = await db.from("virtual_patient_encounter_roles").upsert(
        { session_id: sid, encounter, registrars: lista, chosen_by: c.email, updated_at: new Date().toISOString() },
        { onConflict: "session_id,encounter" });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "ficha_ler") {
      const { data, error } = await db.from("virtual_patient_record_sections")
        .select("encounter, section_key, content, updated_by_name, updated_by_email").eq("session_id", sid);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, secoes: data || [] });
    }

    if (action === "ficha_salvar") {
      const { encounter, section_key, content } = b;
      if (!Number.isInteger(encounter) || encounter < 1 || encounter > 3) return json({ error: "Dados inválidos" }, 400);
      if (typeof section_key !== "string" || !section_key || section_key.length > 80) return json({ error: "Dados inválidos" }, 400);
      if (typeof content !== "string" || content.length > 60000) return json({ error: "Texto grande demais" }, 413);
      const { error } = await db.from("virtual_patient_record_sections").upsert({
        session_id: sid, encounter, section_key, content,
        updated_by_email: c.email, updated_by_name: c.eu.name || c.email, updated_at: new Date().toISOString(),
      }, { onConflict: "session_id,encounter,section_key" });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "mai") {
      const { mai_json, total_score } = b;
      if (!mai_json || typeof mai_json !== "object" || Array.isArray(mai_json) || JSON.stringify(mai_json).length > 200_000) return json({ error: "MAI inválido" }, 400);
      const total = Number(total_score);
      if (!Number.isFinite(total)) return json({ error: "MAI inválido" }, 400);
      const { data: ja } = await db.from("virtual_patient_mai_scores").select("id").eq("session_id", sid).limit(1);
      if (!ja?.length) {
        const { error } = await db.from("virtual_patient_mai_scores").insert({ session_id: sid, mai_json, total_score: total });
        if (error) return json({ error: error.message }, 500);
      }
      const { error: e2 } = await db.from("virtual_patient_sessions").update({ status: "completed", mai_answers_json: mai_json }).eq("id", sid);
      if (e2) return json({ error: e2.message }, 500);
      return json({ ok: true });
    }

    if (action === "espelhar_nota") {
      const { data: g } = await db.from("virtual_patient_grades")
        .select("subscores, bonus_penalidades, nota_final, nota_microlearning, feedback_resumido, orientacoes_melhoria, flags_seguranca, class_virtual_patient_id, rubric_version, grading_model, graded_at")
        .eq("session_id", sid).maybeSingle();
      if (!g) return json({ ok: true, espelhou: false });
      for (const outra of a.irmas.filter((x: string) => x !== sid)) {
        const { data: ex } = await db.from("virtual_patient_grades").select("id").eq("session_id", outra).maybeSingle();
        const payload = { session_id: outra, ...g };
        if (ex?.id) await db.from("virtual_patient_grades").update(payload).eq("id", ex.id);
        else await db.from("virtual_patient_grades").insert(payload);
      }
      return json({ ok: true, espelhou: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("vp-aluno error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
