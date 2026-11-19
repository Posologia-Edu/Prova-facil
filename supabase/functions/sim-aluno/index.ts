// Anamnese realística (simulação), lado do ALUNO. O aluno se identifica com o PIN da sala e o próprio e-mail.
// Ações:
//  - "entrar": valida PIN + e-mail e devolve o estado (o mesmo de "estado"). Professor da sala (participant_role "professor")
//              recebe { ok: true, professor: true } e segue o fluxo próprio dele.
//  - "estado": estado atual da sala para ESTE aluno (a tela chama a cada poucos segundos).
//  - "pronto": o aluno marca que estudou o material.
//  - "enviar": grava o formulário do papel dele na rodada ativa; a nota do observador é calculada aqui.
// O aluno nunca recebe: a lista de participantes, o roteiro do paciente de outro caso, o formulário do professor, nem as respostas dos colegas.
// Substitui as leituras e gravações diretas que a tela do aluno fazia nas tabelas simulation_*.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";
import { computeFormScore } from "../_shared/form-score.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

const ROLE_FORM: Record<string, string> = {
  professional: "anamnesis",
  patient: "patient_script",
  observer: "observer_eval",
  professor: "professor_eval",
};

// ── Regras de material (porte de src/lib/simulation-materials.ts) ──
const pendentes = (rounds: Row[]) =>
  [...rounds].filter((r) => r.status === "pending").sort((a, b) =>
    a.cycle !== b.cycle ? a.cycle - b.cycle
      : a.round_number !== b.round_number ? a.round_number - b.round_number
      : new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

function cicloDoMaterial(rounds: Row[], ativa: Row | null): number {
  if (ativa?.cycle) return ativa.cycle;
  const pend = pendentes(rounds);
  const liberada = pend.find((r) => r.materials_released);
  if (liberada) return liberada.cycle;
  if (pend[0]?.cycle) return pend[0].cycle;
  if (rounds[0]?.cycle) return rounds[0].cycle;
  return 1;
}
const materiaisLiberados = (rounds: Row[], ciclo: number) => rounds.some((r) => r.cycle === ciclo && r.materials_released);
const cicloIniciado = (rounds: Row[], ciclo: number) => rounds.some((r) => r.cycle === ciclo && (r.status === "active" || r.status === "completed"));

function papelDeEstudo(posicao: string | null, ciclo: number): string | null {
  if (posicao === "S") return "professional";
  if (posicao === "A") return ciclo === 1 ? "professional" : "patient";
  if (posicao === "B") return ciclo === 1 ? "patient" : "professional";
  return null;
}

function casoDoCiclo(atribs: Row[], roundIds: string[], participanteId: string, pairIndex: number): number {
  const doCiclo = atribs.filter((a) => roundIds.includes(a.round_id));
  const direto = doCiclo.find((a) => a.participant_id === participanteId && a.assigned_role === "patient" && a.case_index != null);
  if (direto) return direto.case_index;
  const par = doCiclo.find((a) => a.pair_index === pairIndex && a.assigned_role === "patient" && a.case_index != null);
  if (par) return par.case_index;
  const qualquer = doCiclo.find((a) => a.assigned_role === "patient" && a.case_index != null);
  return qualquer?.case_index ?? 0;
}

// ── Roteiro: o observador recebe só os pontos-chave; o paciente recebe o roteiro inteiro do caso dele ──
function resumoParaObservador(caso: Row): Row {
  const r = caso?.roteiro;
  const estruturado = !!r && r.versao === 1 && !!r.identidade && Array.isArray(r.fatos);
  if (!estruturado) return caso;
  return {
    id: caso.id, title: caso.title, script: "",
    roteiro: {
      versao: r.versao,
      identidade: r.identidade,
      motivo_da_vinda: r.motivo_da_vinda,
      fatos: r.fatos.map((f: Row) => ({ id: f.id, categoria: f.categoria, conteudo: f.conteudo, nivel: f.nivel, quando: f.quando, fala: "" })),
      medicamentos: r.medicamentos || [],
      achados: r.achados || [],
    },
  };
}

// Mantém só os casos liberados, nas mesmas posições (os outros viram null) para os índices do caso continuarem valendo.
function recortarRoteiros(content: unknown, liberados: Map<number, "completo" | "resumo">): unknown {
  if (Array.isArray(content) && content.length > 0 && (content[0] as Row)?.cases) {
    const casos = (content[0] as Row).cases as Row[];
    return [{
      ...(content[0] as Row),
      cases: casos.map((c, i) => {
        const modo = liberados.get(i);
        if (!modo) return null;
        return modo === "resumo" ? resumoParaObservador(c) : c;
      }),
    }];
  }
  // Formato antigo: um único roteiro em texto, só para quem faz o paciente.
  if (Array.isArray(content) && content.length > 0 && (content[0] as Row)?.label) {
    return [...liberados.values()].includes("completo") ? content : [];
  }
  return [];
}

async function montarEstado(db: ReturnType<typeof adminClient>, sala: Row, eu: Row) {
  const { data: rodadasRaw } = await db.from("simulation_rounds").select("*").eq("room_id", sala.id).order("round_number", { ascending: true });
  const rodadas = rodadasRaw || [];

  // Marca a entrada do aluno na sala (o painel do professor mostra quem já chegou)
  let euAtual = eu;
  if (eu.status === "waiting" && !rodadas.some((r) => r.materials_released || r.status === "active" || r.status === "completed")) {
    const { error } = await db.from("simulation_participants").update({ status: "joined" }).eq("id", eu.id).eq("status", "waiting");
    if (!error) euAtual = { ...eu, status: "joined" };
  }

  const ids = rodadas.map((r) => r.id);
  const { data: todasAtribs } = ids.length
    ? await db.from("simulation_round_assignments").select("*").in("round_id", ids)
    : { data: [] as Row[] };
  const atribs = todasAtribs || [];
  // O aluno só vê as próprias atribuições e as da dupla dele
  const minhas = atribs.filter((a) => a.participant_id === euAtual.id || (euAtual.pair_index >= 0 && a.pair_index === euAtual.pair_index));

  const ativa = rodadas.find((r) => r.status === "active") || null;
  const minhaAtual = ativa ? atribs.find((a) => a.round_id === ativa.id && a.participant_id === euAtual.id) || null : null;

  const ciclo = cicloDoMaterial(rodadas, ativa);
  const idsDoCiclo = rodadas.filter((r) => r.cycle === ciclo).map((r) => r.id);
  const faseMaterial = !ativa && materiaisLiberados(rodadas, ciclo) && !cicloIniciado(rodadas, ciclo);

  // Papéis para os quais ele precisa de formulário e de roteiro agora
  const papeis = new Set<string>();
  const casos = new Map<number, "completo" | "resumo">();
  if (minhaAtual) {
    papeis.add(minhaAtual.assigned_role);
    const idx = minhaAtual.case_index ?? 0;
    if (minhaAtual.assigned_role === "patient") casos.set(idx, "completo");
    else if (minhaAtual.assigned_role === "observer") casos.set(idx, "resumo");
  } else if (faseMaterial) {
    const direta = atribs.find((a) => idsDoCiclo.includes(a.round_id) && a.participant_id === euAtual.id);
    const papel = papelDeEstudo(euAtual.pair_position, ciclo) || direta?.assigned_role || "professional";
    papeis.add(papel);
    const idx = casoDoCiclo(atribs, idsDoCiclo, euAtual.id, euAtual.pair_index);
    if (papel === "patient") casos.set(idx, "completo");
    else if (papel === "observer") casos.set(idx, "resumo");
  }

  const tipos = new Set<string>();
  for (const p of papeis) if (ROLE_FORM[p] && p !== "professor") tipos.add(ROLE_FORM[p]);
  if (papeis.has("patient") || papeis.has("observer")) tipos.add("patient_script");
  const { data: formsRaw } = await db.from("simulation_forms").select("id, room_id, form_type, title, content_json").eq("room_id", sala.id);
  const todosForms = formsRaw || [];
  const formularios = todosForms.filter((f) => tipos.has(f.form_type)).map((f) =>
    f.form_type === "patient_script" ? { ...f, content_json: recortarRoteiros(f.content_json, casos) } : f);

  // Já enviou o formulário do papel atual nesta rodada?
  let enviou = false;
  if (ativa && minhaAtual) {
    const { data: resp } = await db.from("simulation_responses").select("form_id")
      .eq("round_id", ativa.id).eq("participant_id", euAtual.id).not("submitted_at", "is", null);
    const enviados = (resp || []).map((r) => r.form_id);
    const tipo = ROLE_FORM[minhaAtual.assigned_role];
    const formAtual = tipo ? todosForms.find((f) => f.form_type === tipo) : null;
    enviou = formAtual ? enviados.includes(formAtual.id) : enviados.length > 0;
  }

  return {
    ok: true,
    sala: {
      id: sala.id, access_code: sala.access_code, title: sala.title, status: sala.status,
      duration_minutes: sala.duration_minutes, current_cycle: sala.current_cycle, current_round: sala.current_round,
    },
    participante: {
      id: euAtual.id, student_name: euAtual.student_name, student_email: euAtual.student_email,
      pair_index: euAtual.pair_index, pair_position: euAtual.pair_position, status: euAtual.status, participant_role: euAtual.participant_role,
    },
    rodadas, rodadaAtiva: ativa, atribuicoes: minhas, minhaAtribuicao: minhaAtual, formularios, enviou,
    materiaisProntos: euAtual.status === "ready",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, access_code, email, answers, feedback } = await req.json();
    if (!["entrar", "estado", "pronto", "enviar"].includes(action)) return json({ error: "Ação inválida" }, 400);
    if (typeof access_code !== "string" || access_code.trim().length < 4 || typeof email !== "string" || !email.trim()) return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    const { data: salas } = await db.from("simulation_rooms").select("*").eq("access_code", access_code.trim().toLowerCase()).limit(1);
    const sala = salas?.[0];
    if (!sala) return json({ ok: false, motivo: "sala" });
    if (sala.status === "draft") return json({ ok: false, motivo: "rascunho" });

    const { data: todos } = await db.from("simulation_participants")
      .select("id, student_name, student_email, pair_index, pair_position, status, participant_role").eq("room_id", sala.id);
    const alvo = email.trim().toLowerCase();
    const eu = (todos || []).find((p) => (p.student_email || "").trim().toLowerCase() === alvo);
    if (!eu) return json({ ok: false, motivo: "email" });

    if (eu.participant_role === "professor") {
      if (action === "entrar") return json({ ok: true, professor: true });
      return json({ error: "O professor entra pelo painel, com login." }, 403);
    }

    if (action === "entrar" || action === "estado") return json(await montarEstado(db, sala, eu));

    if (action === "pronto") {
      const { error } = await db.from("simulation_participants").update({ status: "ready" }).eq("id", eu.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // enviar
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) return json({ error: "Respostas inválidas" }, 400);
    if (JSON.stringify(answers).length > 500_000) return json({ error: "Resposta grande demais" }, 413);

    const { data: ativas } = await db.from("simulation_rounds").select("*").eq("room_id", sala.id).eq("status", "active").limit(1);
    const rodada = ativas?.[0];
    if (!rodada) return json({ error: "Não há rodada em andamento." }, 409);
    const { data: atrib } = await db.from("simulation_round_assignments").select("*")
      .eq("round_id", rodada.id).eq("participant_id", eu.id).limit(1);
    const minha = atrib?.[0];
    if (!minha) return json({ error: "Você não participa desta rodada." }, 403);
    if (minha.assigned_role === "patient") return json({ error: "Quem faz o paciente não envia formulário." }, 403);
    const tipo = ROLE_FORM[minha.assigned_role];
    if (!tipo || tipo === "professor_eval") return json({ error: "Papel inválido" }, 403);
    const { data: form } = await db.from("simulation_forms").select("id, form_type, content_json")
      .eq("room_id", sala.id).eq("form_type", tipo).limit(1).maybeSingle();
    if (!form) return json({ error: "A sala não tem esse formulário." }, 409);

    const { data: jaEnviado } = await db.from("simulation_responses").select("id")
      .eq("round_id", rodada.id).eq("participant_id", eu.id).eq("form_id", form.id).not("submitted_at", "is", null).limit(1);
    if (jaEnviado?.length) return json({ ok: true, ja_enviado: true });

    const nota = form.form_type === "observer_eval" && Array.isArray(form.content_json) ? computeFormScore(form.content_json, answers) : 0;
    const { error } = await db.from("simulation_responses").insert({
      round_id: rodada.id,
      participant_id: eu.id,
      form_id: form.id,
      answers_json: { ...answers, _feedback: typeof feedback === "string" ? feedback : "" },
      score: nota,
      submitted_at: new Date().toISOString(),
      is_makeup: !!rodada.is_makeup,
    });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    console.error("sim-aluno error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
