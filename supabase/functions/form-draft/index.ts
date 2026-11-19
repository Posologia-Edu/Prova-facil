// Rascunho automático das telas do aluno (Reconciliação, SOAP, Anamnese, Documentação).
// O aluno se identifica com o PIN da sala e o próprio e-mail; a chave do rascunho precisa pertencer a ele.
// Ações: "load" (lê), "save" (grava) e "clear" (apaga). A tabela form_drafts não é mais aberta ao acesso anônimo.
//
// Formatos de chave (mantidos, para os rascunhos já salvos continuarem valendo):
//   reconciliation:<sala>:<participante>:<formulario>      reconciliation-v2:<sala>:<participante>
//   soap:<sala>:<participante>:<formulario>                soap_peer:<sala>:<participante>:<parceiro>:<formulario>
//   documentation:<sala>:<participante>                    simulation:<rodada>:<participante>:<formulario>
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, forbidden } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// prefixo da chave → tabelas do módulo e valor gravado em form_drafts.module
const MODULOS: Record<string, { salas: string; participantes: string; modulo: string; primeiroId: "sala" | "rodada" }> = {
  "reconciliation": { salas: "reconciliation_rooms", participantes: "reconciliation_participants", modulo: "reconciliation", primeiroId: "sala" },
  "reconciliation-v2": { salas: "reconciliation_rooms", participantes: "reconciliation_participants", modulo: "reconciliation", primeiroId: "sala" },
  "soap": { salas: "soap_rooms", participantes: "soap_participants", modulo: "soap", primeiroId: "sala" },
  "soap_peer": { salas: "soap_rooms", participantes: "soap_participants", modulo: "soap_peer", primeiroId: "sala" },
  "documentation": { salas: "documentation_rooms", participantes: "documentation_participants", modulo: "documentation", primeiroId: "sala" },
  "simulation": { salas: "simulation_rooms", participantes: "simulation_participants", modulo: "simulation", primeiroId: "rodada" },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMITE_BYTES = 500_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, access_code, email, draft_key, answers } = await req.json();
    if (!["load", "save", "clear"].includes(action)) return json({ error: "Ação inválida" }, 400);
    if (typeof access_code !== "string" || access_code.trim().length < 4 || typeof email !== "string" || !email.trim() || typeof draft_key !== "string") {
      return json({ error: "Dados incompletos" }, 400);
    }

    const partes = draft_key.split(":");
    const cfg = MODULOS[partes[0]];
    if (!cfg || partes.length < 3 || !UUID.test(partes[1]) || !UUID.test(partes[2])) return forbidden(corsHeaders);
    const [, id1, participanteId] = partes;

    const db = adminClient();
    const cod = access_code.trim();
    const { data: salas } = await db.from(cfg.salas).select("id").in("access_code", [cod.toLowerCase(), cod]).limit(2);
    const salaIds = (salas || []).map((s: any) => s.id);
    if (!salaIds.length) return forbidden(corsHeaders);

    // A chave tem de apontar para a sala do PIN (ou, na Anamnese, para uma rodada dessa sala).
    let salaId: string | null = null;
    if (cfg.primeiroId === "sala") {
      salaId = salaIds.includes(id1) ? id1 : null;
    } else {
      const { data: rod } = await db.from("simulation_rounds").select("room_id").eq("id", id1).maybeSingle();
      salaId = rod && salaIds.includes(rod.room_id) ? rod.room_id : null;
    }
    if (!salaId) return forbidden(corsHeaders);

    // O participante da chave tem de ser quem tem este e-mail nesta sala.
    const { data: p } = await db.from(cfg.participantes).select("id, room_id, student_email").eq("id", participanteId).maybeSingle();
    const mesmoEmail = (p?.student_email || "").trim().toLowerCase() === email.trim().toLowerCase();
    if (!p || p.room_id !== salaId || !mesmoEmail) return forbidden(corsHeaders);

    if (action === "load") {
      const { data } = await db.from("form_drafts").select("answers_json, updated_at").eq("draft_key", draft_key).maybeSingle();
      return json({ draft: data ? { answers_json: data.answers_json, updated_at: data.updated_at } : null });
    }
    if (action === "clear") {
      await db.from("form_drafts").delete().eq("draft_key", draft_key);
      return json({ ok: true });
    }
    // save
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) return json({ error: "Rascunho inválido" }, 400);
    if (JSON.stringify(answers).length > LIMITE_BYTES) return json({ error: "Rascunho grande demais" }, 413);
    const { error } = await db.from("form_drafts").upsert(
      { draft_key, module: cfg.modulo, answers_json: answers, updated_at: new Date().toISOString() },
      { onConflict: "draft_key" },
    );
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    console.error("form-draft error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
