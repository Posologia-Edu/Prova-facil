// Revisão cruzada da Documentação v2, lado do ALUNO. A dupla i revisa a dupla seguinte (anel). Os documentos de uma dupla só chegam a outra
// por aqui, e só depois que a dupla revisora enviou os PRÓPRIOS documentos. O gabarito e a persona do paciente nunca saem daqui: o revisor
// recebe o dossiê, a conciliação de referência e os documentos do colega, e responde um checklist. A revisão que a dupla RECEBEU só
// aparece para ela na devolutiva, depois que o professor libera. O aluno se identifica com o PIN e o próprio e-mail. Ações: "estado" e "enviar".
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, forbidden } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Mesma regra de src/lib/doc-v2-nota.ts (as funções não importam de src/).
function parARevisar(pair: number, pares: number[]): number | null {
  const lista = [...new Set(pares.filter((p) => p >= 0))].sort((a, b) => a - b);
  if (lista.length < 2 || !lista.includes(pair)) return null;
  return lista[(lista.indexOf(pair) + 1) % lista.length];
}
const ITENS_NUCLEO = ["rv-destino", "rv-sbar", "rv-cobertura", "rv-grade", "rv-linguagem", "rv-alertas", "rv-coerencia", "rv-usaria"];
// Um item a mais por documento extra ativo (mesma regra de src/lib/doc-v2-nota.ts).
const ITEM_EXTRA: Record<string, string> = { ram: "rv-ram", incidente: "rv-incidente", consulta: "rv-consulta", dispositivo: "rv-dispositivo" };
const itensDe = (extras: unknown): string[] => [...ITENS_NUCLEO, ...(Array.isArray(extras) ? extras : []).map((e) => ITEM_EXTRA[String(e)]).filter(Boolean)];
const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { action, access_code, email, respostas, comentario } = await req.json();
    if (!["estado", "enviar"].includes(action)) return json({ error: "Ação inválida" }, 400);
    if (typeof access_code !== "string" || access_code.trim().length < 4 || typeof email !== "string" || !email.trim()) return json({ error: "Dados incompletos" }, 400);

    const db = adminClient();
    const { data: sala } = await db.from("documentation_rooms").select("id, schema_version, documentos_extra")
      .eq("access_code", access_code.trim().toLowerCase()).eq("status", "active").maybeSingle();
    if (!sala || sala.schema_version !== 2) return forbidden(corsHeaders);

    const { data: alunos } = await db.from("documentation_participants").select("pair_index, student_email")
      .eq("room_id", sala.id).eq("participant_role", "student");
    const eu = (alunos || []).find((a: any) => String(a.student_email || "").trim().toLowerCase() === email.trim().toLowerCase());
    if (!eu || eu.pair_index < 0) return forbidden(corsHeaders);

    const { data: minha } = await db.from("documentation_v2_respostas").select("id, submitted_at")
      .eq("room_id", sala.id).eq("pair_index", eu.pair_index).maybeSingle();
    if (!minha?.submitted_at) return json({ estado: "aguardando_minha" });

    const alvoIdx = parARevisar(eu.pair_index, (alunos || []).map((a: any) => a.pair_index));
    if (alvoIdx === null) return json({ estado: "sem_par" });

    const { data: minhaRev } = await db.from("documentation_v2_revisoes").select("answers_json, submitted_at")
      .eq("room_id", sala.id).eq("reviewer_pair", eu.pair_index).maybeSingle();
    if (minhaRev?.submitted_at) return json({ estado: "enviada" });

    const { data: alvo } = await db.from("documentation_v2_respostas")
      .select("id, clinical_case_id, respostas, submitted_at").eq("room_id", sala.id).eq("pair_index", alvoIdx).maybeSingle();
    if (!alvo?.submitted_at) return json({ estado: "aguardando_outra" });

    if (action === "estado") {
      const { data: caso } = await db.from("documentation_clinical_cases").select("title, caso_json").eq("id", alvo.clinical_case_id).maybeSingle();
      const { data: priv } = await db.from("documentation_v2_privado").select("referencia").eq("case_id", alvo.clinical_case_id).maybeSingle();
      if (!caso?.caso_json) return json({ error: "O caso da dupla revisada não tem dossiê v2." }, 409);
      return json({
        estado: "revisar",
        alvo: {
          rotulo: `Dupla ${alvoIdx + 1}`,
          caso: { titulo: caso.title, caso_json: caso.caso_json },
          referencia: Array.isArray(priv?.referencia) ? priv!.referencia : [],
          respostas: alvo.respostas || {},
          ocorrencias: (caso.caso_json as any)?.ocorrencias || {},
        },
        extras: Array.isArray(sala.documentos_extra) ? sala.documentos_extra : [],
      });
    }

    // enviar
    if (!respostas || typeof respostas !== "object" || Array.isArray(respostas)) return json({ error: "Respostas ausentes" }, 400);
    const limpo: Record<string, string> = {};
    for (const id of itensDe(sala.documentos_extra)) {
      if (!["sim", "parcial", "nao"].includes((respostas as any)[id])) return json({ error: "Responda todos os itens do checklist." }, 400);
      limpo[id] = (respostas as any)[id];
    }
    const { error } = await db.from("documentation_v2_revisoes").upsert({
      room_id: sala.id, reviewer_pair: eu.pair_index, reviewed_pair: alvoIdx, reviewed_response_id: alvo.id,
      answers_json: { ...limpo, comentario: clip(comentario, 2000) }, submitted_at: new Date().toISOString(),
    }, { onConflict: "room_id,reviewer_pair" });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    console.error("doc-v2-revisao error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
