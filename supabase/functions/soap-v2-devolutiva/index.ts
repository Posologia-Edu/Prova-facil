// Devolutiva do SOAP v2 para o ALUNO. Só devolve algo depois que o professor confirmou a nota e liberou, e só o que é do aluno:
// critérios com justificativa, comentário, mapa do iceberg e calibração. A auditoria de fatos, a cobertura do gabarito e o
// gabarito em si nunca saem daqui. O aluno se identifica com o PIN da sala e o próprio e-mail.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, roomCodeMatches, forbidden } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { response_id, access_code, email } = await req.json();
    if (!response_id || typeof email !== "string") return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    const { data: resp } = await db.from("soap_responses")
      .select("id, room_id, participant_id, target_participant_id, admin_score").eq("id", response_id).maybeSingle();
    if (!resp || resp.target_participant_id) return forbidden(corsHeaders);
    if (!(await roomCodeMatches("soap_rooms", resp.room_id, access_code))) return forbidden(corsHeaders);

    // O SOAP precisa ser do próprio aluno que está pedindo.
    const { data: aluno } = await db.from("soap_participants").select("student_email").eq("id", resp.participant_id).maybeSingle();
    if (!aluno || String(aluno.student_email || "").trim().toLowerCase() !== email.trim().toLowerCase()) return forbidden(corsHeaders);

    const { data: av } = await db.from("soap_v2_avaliacoes").select("dados, confirmada, liberada").eq("response_id", response_id).maybeSingle();
    if (!av || !av.confirmada || !av.liberada) return json({ liberada: false });

    const d: any = av.dados || {};
    return json({
      liberada: true,
      nota: resp.admin_score != null ? Number(resp.admin_score) : null,
      criterios: d.respostas || {},
      justificativas: d.justificativas || {},
      comentario: d.comentario || "",
      iceberg: Array.isArray(d.iceberg) ? d.iceberg : [],
      calibracao: Array.isArray(d.calibracao) ? d.calibracao : [],
      confirmado_em: d.confirmado_em || null,
    });
  } catch (e) {
    console.error("soap-v2-devolutiva error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
