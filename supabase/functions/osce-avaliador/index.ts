// OSCE, lado do AVALIADOR. O avaliador se identifica com o código do circuito e o e-mail cadastrado como avaliador de uma estação.
// Ações:
//  - "estado": circuito, estação do avaliador (com caso e roteiro, que só o avaliador vê), checklist, materiais,
//              aluno que está agora na estação, chat dele e a avaliação em andamento (se houver). Consultada de tempos em tempos.
//  - "iniciar": abre a avaliação do aluno que está na estação (se já houver uma aberta, devolve a mesma).
//  - "item": grava o valor e a observação de um item do checklist.
//  - "finalizar": fecha a avaliação (nota calculada aqui, pelos itens gravados) e faz a rotação dos alunos no circuito.
// A rotação (concluir, mandar à próxima estação livre, pôr em espera, chamar quem esperava) acontece toda aqui, de uma vez,
// no lugar de o navegador do avaliador fazer várias gravações soltas.
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

// deno-lint-ignore no-explicit-any
type Db = any;

const COLS_ALUNO = "id, student_name, student_email, status, current_station_id, current_rotation, station_entered_at, visited_stations, created_at";

async function alunoNaEstacao(db: Db, circuitId: string, stationId: string) {
  const { data } = await db.from("osce_circuit_students").select(COLS_ALUNO)
    .eq("circuit_id", circuitId).eq("current_station_id", stationId).eq("status", "in_station").limit(1).maybeSingle();
  return data;
}

// Nota pelos itens gravados: mesma conta que a tela fazia (valor x peso; crítico com 0 reprova)
async function calculaNota(db: Db, evaluationId: string, stationId: string) {
  const { data: itens } = await db.from("osce_checklist_items")
    .select("id, type, likert_max, max_points, weight, is_critical").eq("station_id", stationId);
  const { data: vals } = await db.from("osce_evaluation_items").select("checklist_item_id, value").eq("evaluation_id", evaluationId);
  const porItem = new Map<string, number>((vals || []).map((v: any) => [v.checklist_item_id, Number(v.value) || 0]));
  let total = 0, max = 0, passed = true;
  for (const it of itens || []) {
    const v = porItem.get(it.id) || 0;
    const itemMax = it.type === "binary" ? 1 : it.type === "likert" ? Number(it.likert_max) : Number(it.max_points);
    const w = Number(it.weight) || 0;
    max += itemMax * w;
    total += v * w;
    if (it.is_critical && v === 0) passed = false;
  }
  return { total, max, passed };
}

async function giraRotacao(db: Db, circuitId: string, examId: string, estacaoId: string, aluno: any) {
  const { data: clin } = await db.from("osce_stations").select("id, position")
    .eq("osce_exam_id", examId).eq("is_rest_station", false).order("position");
  const todas: string[] = (clin || []).map((s: any) => s.id);
  const visitadas = [...new Set<string>([...(aluno.visited_stations || []), estacaoId])];

  if (visitadas.length >= todas.length) {
    await db.from("osce_circuit_students").update({ status: "completed", current_station_id: null, visited_stations: visitadas }).eq("id", aluno.id);
  } else {
    const naoVisitadas = todas.filter((id) => !visitadas.includes(id));
    const { data: ocupados } = await db.from("osce_circuit_students").select("current_station_id")
      .eq("circuit_id", circuitId).eq("status", "in_station").neq("id", aluno.id);
    const ocupadas = new Set((ocupados || []).map((s: any) => s.current_station_id).filter(Boolean));
    const livres = naoVisitadas.filter((id) => !ocupadas.has(id));
    if (livres.length > 0) {
      await db.from("osce_circuit_students").update({
        status: "in_station", current_station_id: livres[0], station_entered_at: new Date().toISOString(),
        visited_stations: visitadas, current_rotation: visitadas.length + 1,
      }).eq("id", aluno.id);
    } else {
      await db.from("osce_circuit_students").update({ status: "waiting", current_station_id: null, visited_stations: visitadas }).eq("id", aluno.id);
    }
  }

  // A estação ficou livre: chama o primeiro aluno em espera que ainda não passou por ela
  const { data: esperando } = await db.from("osce_circuit_students").select("id, visited_stations")
    .eq("circuit_id", circuitId).eq("status", "waiting").order("created_at");
  for (const s of esperando || []) {
    const v: string[] = s.visited_stations || [];
    if (!v.includes(estacaoId)) {
      await db.from("osce_circuit_students").update({
        status: "in_station", current_station_id: estacaoId, station_entered_at: new Date().toISOString(), current_rotation: v.length + 1,
      }).eq("id", s.id);
      return;
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const b = await req.json();
    const { action, access_code, email } = b;
    if (!["estado", "iniciar", "item", "finalizar"].includes(action)) return json({ error: "Ação inválida" }, 400);
    if (typeof access_code !== "string" || access_code.trim().length < 4 || !norm(email)) return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    const { data: circuitos } = await db.from("osce_circuits")
      .select("id, status, osce_exam_id, current_rotation, osce_exams(title, station_duration_minutes)")
      .eq("access_code", access_code.trim()).limit(1);
    const circuito = circuitos?.[0];
    if (!circuito) return json({ ok: false, motivo: "circuito" });

    const { data: estacoes } = await db.from("osce_stations").select("id").eq("osce_exam_id", circuito.osce_exam_id);
    const estacaoIds = (estacoes || []).map((s: any) => s.id);
    if (!estacaoIds.length) return json({ ok: false, motivo: "avaliador" });
    const { data: avs } = await db.from("osce_station_evaluators").select("station_id, evaluator_email").in("station_id", estacaoIds);
    const meu = (avs || []).find((a: any) => norm(a.evaluator_email) === norm(email));
    if (!meu) return json({ ok: false, motivo: "avaliador" });
    const estacaoId: string = meu.station_id;
    const aluno = await alunoNaEstacao(db, circuito.id, estacaoId);

    // ---------- iniciar ----------
    if (action === "iniciar") {
      if (!aluno) return json({ ok: false, motivo: "sem_aluno" }, 409);
      const { data: abertas } = await db.from("osce_evaluations").select("id")
        .eq("circuit_id", circuito.id).eq("station_id", estacaoId).eq("student_email", aluno.student_email)
        .eq("rotation", aluno.current_rotation || 0).is("finished_at", null).limit(1);
      if (abertas?.[0]) return json({ ok: true, avaliacao_id: abertas[0].id });
      const { data: nova, error } = await db.from("osce_evaluations").insert({
        circuit_id: circuito.id, station_id: estacaoId, student_name: aluno.student_name,
        student_email: aluno.student_email, rotation: aluno.current_rotation || 0,
      }).select("id").single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, avaliacao_id: nova.id });
    }

    // as duas ações seguintes mexem numa avaliação desta estação e deste circuito
    if (action === "item" || action === "finalizar") {
      if (typeof b.evaluation_id !== "string" || !UUID.test(b.evaluation_id)) return json({ error: "Dados inválidos" }, 400);
      const { data: av } = await db.from("osce_evaluations").select("id, circuit_id, station_id, student_email, finished_at")
        .eq("id", b.evaluation_id).maybeSingle();
      if (!av || av.circuit_id !== circuito.id || av.station_id !== estacaoId) return json({ ok: false, motivo: "avaliacao" }, 403);

      if (action === "item") {
        if (av.finished_at) return json({ ok: false, motivo: "finalizada" }, 409);
        const { checklist_item_id, value, notes } = b;
        if (typeof checklist_item_id !== "string" || !UUID.test(checklist_item_id)) return json({ error: "Dados inválidos" }, 400);
        const { data: it } = await db.from("osce_checklist_items").select("id, type, likert_max, max_points")
          .eq("id", checklist_item_id).eq("station_id", estacaoId).maybeSingle();
        if (!it) return json({ error: "Item inválido" }, 400);
        const v = Number(value);
        const teto = it.type === "binary" ? 1 : it.type === "likert" ? Number(it.likert_max) : Number(it.max_points);
        if (!Number.isFinite(v) || v < 0 || v > teto) return json({ error: "Valor inválido" }, 400);
        const nota = typeof notes === "string" ? notes.slice(0, 5000) : "";
        const { data: ex } = await db.from("osce_evaluation_items").select("id").eq("evaluation_id", av.id).eq("checklist_item_id", it.id).maybeSingle();
        const { error } = ex
          ? await db.from("osce_evaluation_items").update({ value: v, notes: nota }).eq("id", ex.id)
          : await db.from("osce_evaluation_items").insert({ evaluation_id: av.id, checklist_item_id: it.id, value: v, notes: nota });
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }

      // finalizar (idempotente: uma avaliação já fechada não gira a rotação de novo)
      if (av.finished_at) return json({ ok: true, jaFinalizada: true });
      const observacoes = typeof b.observations === "string" ? b.observations.slice(0, 20000) : "";
      const nota = await calculaNota(db, av.id, estacaoId);
      const { error } = await db.from("osce_evaluations").update({
        observations: observacoes, total_score: nota.total, max_score: nota.max, passed: nota.passed, finished_at: new Date().toISOString(),
      }).eq("id", av.id);
      if (error) return json({ error: error.message }, 500);

      // o aluno avaliado ainda precisa estar nesta estação para girar a rotação
      const { data: ele } = await db.from("osce_circuit_students").select(COLS_ALUNO)
        .eq("circuit_id", circuito.id).eq("current_station_id", estacaoId).eq("status", "in_station").limit(1).maybeSingle();
      if (ele && norm(ele.student_email) === norm(av.student_email)) {
        await giraRotacao(db, circuito.id, circuito.osce_exam_id, estacaoId, ele);
      }
      return json({ ok: true, total: nota.total, max: nota.max, passed: nota.passed });
    }

    // ---------- estado ----------
    const { data: est } = await db.from("osce_stations")
      .select("id, title, duration_minutes, student_instructions, case_summary, patient_script").eq("id", estacaoId).maybeSingle();
    const { data: checklist } = await db.from("osce_checklist_items").select("*").eq("station_id", estacaoId).order("position");
    const { data: materiais } = await db.from("osce_station_materials")
      .select("id, station_id, title, type, content, file_url, position").eq("station_id", estacaoId).order("position");

    let mensagens: unknown[] = [];
    let avaliacao: unknown = null;
    let itens: unknown[] = [];
    if (aluno) {
      const { data: ms } = await db.from("osce_chat_messages").select("role, content, created_at")
        .eq("circuit_id", circuito.id).eq("station_id", estacaoId).eq("student_id", aluno.id).order("created_at", { ascending: true });
      mensagens = ms || [];
      const { data: ab } = await db.from("osce_evaluations").select("id, observations")
        .eq("circuit_id", circuito.id).eq("station_id", estacaoId).eq("student_email", aluno.student_email)
        .eq("rotation", aluno.current_rotation || 0).is("finished_at", null).limit(1).maybeSingle();
      if (ab) {
        avaliacao = ab;
        const { data: its } = await db.from("osce_evaluation_items").select("checklist_item_id, value, notes").eq("evaluation_id", ab.id);
        itens = its || [];
      }
    }
    return json({
      ok: true,
      circuito: { id: circuito.id, status: circuito.status, osce_exam_id: circuito.osce_exam_id, osce_exams: circuito.osce_exams },
      estacao: est || null,
      checklist: checklist || [],
      materiais: materiais || [],
      aluno: aluno ? {
        id: aluno.id, student_name: aluno.student_name, student_email: aluno.student_email, current_rotation: aluno.current_rotation,
        station_entered_at: aluno.station_entered_at, visited_stations: aluno.visited_stations || [],
      } : null,
      mensagens, avaliacao, itens,
    });
  } catch (e) {
    console.error("osce-avaliador error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
