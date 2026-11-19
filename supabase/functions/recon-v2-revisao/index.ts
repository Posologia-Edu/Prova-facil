// Revisão cruzada da Reconciliação v2, lado do ALUNO. A dupla i revisa a dupla seguinte (anel). A resposta de uma dupla só chega a outra
// por aqui, e só depois que a dupla revisora enviou a PRÓPRIA resposta final. O gabarito nunca sai daqui: o revisor recebe o dossiê,
// a prescrição do caso revisado e as respostas do colega, e responde um checklist. O aluno se identifica com o PIN e o próprio e-mail.
// Ações: "estado" e "enviar".
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, forbidden } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Mesma regra de src/lib/recon-v2-nota.ts (as funções não importam de src/).
function parARevisar(pair: number, pares: number[]): number | null {
  const lista = [...new Set(pares.filter((p) => p >= 0))].sort((a, b) => a - b);
  if (lista.length < 2 || !lista.includes(pair)) return null;
  return lista[(lista.indexOf(pair) + 1) % lista.length];
}

const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, access_code, email, answers } = await req.json();
    if (!["estado", "enviar"].includes(action)) return json({ error: "Ação inválida" }, 400);
    if (typeof access_code !== "string" || access_code.trim().length < 4 || typeof email !== "string" || !email.trim()) return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    const { data: sala } = await db.from("reconciliation_rooms").select("id, schema_version")
      .eq("access_code", access_code.trim().toLowerCase()).eq("status", "active").maybeSingle();
    if (!sala || sala.schema_version !== 2) return forbidden(corsHeaders);

    const { data: alunos } = await db.from("reconciliation_participants").select("pair_index, student_email")
      .eq("room_id", sala.id).eq("participant_role", "student");
    const eu = (alunos || []).find((a: any) => String(a.student_email || "").trim().toLowerCase() === email.trim().toLowerCase());
    if (!eu || eu.pair_index < 0) return forbidden(corsHeaders);

    const { data: minha } = await db.from("reconciliation_responses").select("id, submitted_at")
      .eq("room_id", sala.id).eq("pair_index", eu.pair_index).maybeSingle();
    if (!minha?.submitted_at) return json({ estado: "aguardando_minha" });

    const alvoIdx = parARevisar(eu.pair_index, (alunos || []).map((a: any) => a.pair_index));

    // A revisão que a minha dupla RECEBEU (sem dizer quem revisou).
    const { data: recebida } = await db.from("reconciliation_v2_revisoes").select("answers_json, submitted_at")
      .eq("room_id", sala.id).eq("reviewed_pair", eu.pair_index).not("submitted_at", "is", null).maybeSingle();

    const { data: formRev } = await db.from("reconciliation_forms").select("id, content_json")
      .eq("room_id", sala.id).eq("form_type", "peer_evaluation").limit(1).maybeSingle();

    const { data: minhaRev } = await db.from("reconciliation_v2_revisoes").select("answers_json, submitted_at")
      .eq("room_id", sala.id).eq("reviewer_pair", eu.pair_index).maybeSingle();

    const base = {
      formulario_revisao: formRev ? { id: formRev.id, campos: formRev.content_json } : null,
      recebida: recebida ? recebida.answers_json : null,
    };

    if (alvoIdx === null) return json({ estado: "sem_par", ...base });
    if (minhaRev?.submitted_at) return json({ estado: "enviada", minha_revisao: minhaRev.answers_json, ...base });

    const { data: alvo } = await db.from("reconciliation_responses")
      .select("id, form_id, clinical_case_id, answers_json, bpmh_json, fontes_json, submitted_at")
      .eq("room_id", sala.id).eq("pair_index", alvoIdx).maybeSingle();
    if (!alvo?.submitted_at) return json({ estado: "aguardando_outra", ...base });

    if (!formRev) return json({ error: "A sala não tem o checklist da revisão cruzada. Avise o professor." }, 409);

    const { data: caso } = await db.from("reconciliation_clinical_cases").select("id, title, caso_json").eq("id", alvo.clinical_case_id).maybeSingle();
    const { data: priv } = await db.from("reconciliation_v2_privado").select("prescricao").eq("case_id", alvo.clinical_case_id).maybeSingle();
    const { data: formAlvo } = await db.from("reconciliation_forms").select("content_json").eq("id", alvo.form_id).maybeSingle();
    if (!caso?.caso_json) return json({ error: "O caso da dupla revisada não tem dossiê v2." }, 409);

    if (action === "estado") {
      return json({
        estado: "revisar",
        alvo: {
          rotulo: `Dupla ${alvoIdx + 1}`,
          caso: { titulo: caso.title, caso_json: caso.caso_json },
          prescricao: Array.isArray(priv?.prescricao) ? priv!.prescricao : [],
          campos: Array.isArray(formAlvo?.content_json) ? formAlvo!.content_json : [],
          respostas: alvo.answers_json || {},
        },
        ...base,
      });
    }

    // enviar
    if (!answers || typeof answers !== "object") return json({ error: "Respostas ausentes" }, 400);
    const campos: any[] = Array.isArray(formRev.content_json) ? formRev.content_json : [];
    const permitidos = new Set(campos.filter((f) => f.type !== "section_header").map((f) => f.id));
    const limpo: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(answers as Record<string, unknown>)) if (permitidos.has(k)) limpo[k] = typeof v === "string" ? clip(v, 2000) : v;
    const obrigatorios = campos.filter((f) => f.required);
    const faltando = obrigatorios.filter((f) => !String(limpo[f.id] ?? "").trim());
    if (faltando.length) return json({ error: `Preencha: ${faltando.map((f) => f.label).join("; ")}` }, 400);

    const { error } = await db.from("reconciliation_v2_revisoes").upsert({
      room_id: sala.id, reviewer_pair: eu.pair_index, reviewed_pair: alvoIdx, reviewed_response_id: alvo.id,
      form_id: formRev.id, answers_json: limpo, submitted_at: new Date().toISOString(),
    }, { onConflict: "room_id,reviewer_pair" });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    console.error("recon-v2-revisao error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
