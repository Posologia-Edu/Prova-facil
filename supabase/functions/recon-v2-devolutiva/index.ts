// Devolutiva da Reconciliação v2 para o ALUNO. Só devolve algo depois que o professor confirmou a nota e liberou, e só o que é da
// dupla: critérios com justificativa, comentário, matriz de discrepâncias (com a fonte que revelava cada uma) e a BPMH comparada.
// A conferência em código, as discrepâncias inventadas e os problemas de segurança do gabarito não saem daqui.
// O aluno se identifica com o PIN da sala e o próprio e-mail.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, forbidden } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { access_code, email } = await req.json();
    if (typeof access_code !== "string" || access_code.trim().length < 4 || typeof email !== "string" || !email.trim()) return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    const { data: sala } = await db.from("reconciliation_rooms").select("id, schema_version").eq("access_code", access_code.trim().toLowerCase()).maybeSingle();
    if (!sala || sala.schema_version !== 2) return forbidden(corsHeaders);

    const { data: partes } = await db.from("reconciliation_participants").select("pair_index")
      .eq("room_id", sala.id).eq("participant_role", "student").eq("student_email", email.trim().toLowerCase());
    const eu = partes?.[0];
    if (!eu || eu.pair_index < 0) return forbidden(corsHeaders);

    const { data: resp } = await db.from("reconciliation_responses").select("id, admin_score, submitted_at")
      .eq("room_id", sala.id).eq("pair_index", eu.pair_index).maybeSingle();
    if (!resp?.submitted_at) return json({ liberada: false });

    const { data: av } = await db.from("reconciliation_v2_avaliacoes").select("dados, confirmada, liberada").eq("response_id", resp.id).maybeSingle();
    if (!av || !av.confirmada || !av.liberada) return json({ liberada: false });

    const d: any = av.dados || {};
    return json({
      liberada: true,
      nota: resp.admin_score != null ? Number(resp.admin_score) : null,
      criterios: d.respostas || {},
      justificativas: d.justificativas || {},
      comentario: d.comentario || "",
      matriz: Array.isArray(d.matriz) ? d.matriz : [],
      bpmh: Array.isArray(d.bpmh) ? d.bpmh : [],
      confirmado_em: d.confirmado_em || null,
    });
  } catch (e) {
    console.error("recon-v2-devolutiva error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
