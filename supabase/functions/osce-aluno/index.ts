// OSCE, lado do ALUNO. O aluno se identifica com o código do circuito e o e-mail cadastrado nele.
// Ações:
//  - "estado": devolve o circuito, o registro do aluno, a estação atual (só o que o aluno pode ver) e os materiais.
//              A tela chama de tempos em tempos no lugar do realtime.
//  - "mensagem": grava uma mensagem do chat do aluno com o paciente virtual da estação em que ele está.
// Nunca devolve: roteiro do paciente, prompt do sistema, resumo do caso, objetivos, checklist nem dados de outros alunos.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const norm = (s: unknown) => (typeof s === "string" ? s.trim().toLowerCase() : "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, access_code, email, role, content } = await req.json();
    if (!["estado", "mensagem"].includes(action)) return json({ error: "Ação inválida" }, 400);
    if (typeof access_code !== "string" || access_code.trim().length < 4 || !norm(email)) return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    const { data: circuitos } = await db.from("osce_circuits")
      .select("id, status, osce_exam_id, current_rotation, osce_exams(title, station_duration_minutes)")
      .eq("access_code", access_code.trim()).limit(1);
    const circuito = circuitos?.[0];
    if (!circuito) return json({ ok: false, motivo: "circuito" });

    const { data: alunos } = await db.from("osce_circuit_students")
      .select("id, student_name, student_email, status, current_station_id, current_rotation, station_entered_at, visited_stations")
      .eq("circuit_id", circuito.id);
    const alvo = norm(email);
    const eu = (alunos || []).find((s: any) => norm(s.student_email) === alvo);
    if (!eu) return json({ ok: false, motivo: "email" });

    if (action === "mensagem") {
      if (role !== "user" && role !== "assistant") return json({ error: "Dados inválidos" }, 400);
      if (typeof content !== "string" || !content.trim() || content.length > 20000) return json({ error: "Mensagem inválida" }, 400);
      if (eu.status !== "in_station" || !eu.current_station_id) return json({ ok: false, motivo: "fora_da_estacao" }, 409);
      const { error } = await db.from("osce_chat_messages").insert({
        circuit_id: circuito.id, station_id: eu.current_station_id, student_id: eu.id, role, content,
      });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    let estacao: unknown = null;
    let materiais: unknown[] = [];
    if (eu.current_station_id) {
      const { data: e } = await db.from("osce_stations")
        .select("id, title, duration_minutes, student_instructions, virtual_patient_enabled, is_rest_station")
        .eq("id", eu.current_station_id).maybeSingle();
      estacao = e || null;
      const { data: m } = await db.from("osce_station_materials")
        .select("id, station_id, title, type, content, file_url, position")
        .eq("station_id", eu.current_station_id).order("position");
      materiais = m || [];
    }
    return json({
      ok: true,
      circuito: { id: circuito.id, status: circuito.status, osce_exam_id: circuito.osce_exam_id, osce_exams: circuito.osce_exams },
      aluno: {
        id: eu.id, student_name: eu.student_name, status: eu.status, current_station_id: eu.current_station_id,
        current_rotation: eu.current_rotation, station_entered_at: eu.station_entered_at, visited_stations: eu.visited_stations || [],
      },
      estacao, materiais,
    });
  } catch (e) {
    console.error("osce-aluno error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
