// Envia por e-mail o retorno do observador ao aluno que representou o paciente na simulação de anamnese (sem notas).
// O professor revisa e dispara; só vão e-mails de participantes da própria sala.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { adminClient, getUserId, ownsRoom, unauthorized, forbidden } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FROM_EMAIL = "ProvaFácil <noreply@tbl.posologia.app>";

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Rodada = { rodada: number; caso?: string; seguiu_roteiro?: string; observacoes?: string };
type Item = { email: string; nome?: string; rodadas: Rodada[] };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return unauthorized(corsHeaders);

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) throw new Error("Serviço de email não configurado");

    const { room_id, room_title, itens } = await req.json();
    if (!room_id || !(await ownsRoom("simulation_rooms", room_id, userId))) return forbidden(corsHeaders);
    if (!Array.isArray(itens) || itens.length === 0) return json({ error: "Nada a enviar" }, 400);

    // Só e-mails de participantes desta sala.
    const { data: parts } = await adminClient().from("simulation_participants").select("student_email").eq("room_id", room_id);
    const validos = new Set((parts || []).map((p: any) => String(p.student_email || "").trim().toLowerCase()).filter(Boolean));

    const resend = new Resend(apiKey);
    const results: { email: string; success: boolean; error?: string }[] = [];
    for (const item of itens as Item[]) {
      const email = String(item.email || "").trim().toLowerCase();
      if (!validos.has(email)) { results.push({ email, success: false, error: "e-mail não é de participante da sala" }); continue; }
      const rodadas = (item.rodadas || []).filter((r) => r.seguiu_roteiro || r.observacoes);
      if (rodadas.length === 0) { results.push({ email, success: false, error: "sem retorno do observador" }); continue; }

      const blocos = rodadas.map((r) => `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin: 12px 0;">
          <p style="margin: 0 0 6px; font-weight: bold;">Rodada ${esc(r.rodada)}${r.caso ? ` · ${esc(r.caso)}` : ""}</p>
          ${r.seguiu_roteiro ? `<p style="margin: 6px 0;"><strong>Você seguiu o roteiro?</strong> ${esc(r.seguiu_roteiro)}</p>` : ""}
          ${r.observacoes ? `<p style="margin: 6px 0; white-space: pre-wrap;"><strong>Observações do observador:</strong><br/>${esc(r.observacoes)}</p>` : ""}
        </div>`).join("");

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #2563eb; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">Seu retorno como paciente</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">ProvaFácil</p>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
            <p>Olá${item.nome ? `, <strong>${esc(item.nome)}</strong>` : ""},</p>
            <p>Na sala <strong>${esc(room_title || "Simulação")}</strong>, você representou o paciente. Veja o retorno de quem observou o atendimento:</p>
            ${blocos}
            <p style="font-size: 13px; color: #6b7280;">Este retorno não vale nota. Serve para você ver como foi a sua atuação como paciente.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #6b7280;">Este email foi enviado automaticamente pelo ProvaFácil.</p>
          </div>
        </div>`;

      try {
        const { error } = await resend.emails.send({ from: FROM_EMAIL, to: [email], subject: `Seu retorno como paciente — ${room_title || "Simulação"}`, html });
        results.push({ email, success: !error, ...(error ? { error: error.message || JSON.stringify(error) } : {}) });
      } catch (err) {
        results.push({ email, success: false, error: String(err) });
      }
    }
    return json({ results });
  } catch (e) {
    console.error("send-patient-feedback error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
