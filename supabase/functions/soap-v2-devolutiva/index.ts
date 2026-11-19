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
    if (typeof email !== "string" || !email.trim()) return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    let resp: any = null;
    if (response_id) {
      ({ data: resp } = await db.from("soap_responses")
        .select("id, room_id, participant_id, target_participant_id, admin_score").eq("id", response_id).maybeSingle());
    } else {
      // Sem o id da resposta: acha o SOAP do próprio aluno pelo PIN e pelo e-mail. Sem SOAP enviado, ainda não há devolutiva.
      if (typeof access_code !== "string" || access_code.trim().length < 4) return json({ error: "Dados incompletos" }, 400);
      const { data: sala } = await db.from("soap_rooms").select("id").eq("access_code", access_code.trim().toLowerCase()).maybeSingle();
      if (!sala) return forbidden(corsHeaders);
      const { data: ps } = await db.from("soap_participants").select("id, student_email").eq("room_id", sala.id);
      const eu = (ps || []).find((p: any) => String(p.student_email || "").trim().toLowerCase() === email.trim().toLowerCase());
      if (!eu) return forbidden(corsHeaders);
      ({ data: resp } = await db.from("soap_responses")
        .select("id, room_id, participant_id, target_participant_id, admin_score").eq("room_id", sala.id).eq("participant_id", eu.id).is("target_participant_id", null).limit(1).maybeSingle());
      if (!resp) return json({ liberada: false });
    }
    if (!resp || resp.target_participant_id) return forbidden(corsHeaders);
    if (!(await roomCodeMatches("soap_rooms", resp.room_id, access_code))) return forbidden(corsHeaders);

    // O SOAP precisa ser do próprio aluno que está pedindo.
    const { data: aluno } = await db.from("soap_participants").select("student_email").eq("id", resp.participant_id).maybeSingle();
    if (!aluno || String(aluno.student_email || "").trim().toLowerCase() !== email.trim().toLowerCase()) return forbidden(corsHeaders);

    const { data: av } = await db.from("soap_v2_avaliacoes").select("dados, confirmada, liberada").eq("response_id", resp.id).maybeSingle();
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
