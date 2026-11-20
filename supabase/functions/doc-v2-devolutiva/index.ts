// Devolutiva da Documentação v2 para o ALUNO. Só devolve algo depois que o professor confirmou a nota e liberou, e só o que é da dupla:
// nota, critérios com justificativa, comentário e alertas de segurança. O aluno se identifica com o PIN da sala e o próprio e-mail.
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
    const { data: sala } = await db.from("documentation_rooms").select("id, schema_version, documentos_extra").eq("access_code", access_code.trim().toLowerCase()).maybeSingle();
    if (!sala || sala.schema_version !== 2) return forbidden(corsHeaders);

    const { data: partes } = await db.from("documentation_participants").select("pair_index")
      .eq("room_id", sala.id).eq("participant_role", "student").eq("student_email", email.trim().toLowerCase());
    const eu = partes?.[0];
    if (!eu || eu.pair_index < 0) return forbidden(corsHeaders);

    const { data: resp } = await db.from("documentation_v2_respostas").select("id, submitted_at")
      .eq("room_id", sala.id).eq("pair_index", eu.pair_index).maybeSingle();
    if (!resp?.submitted_at) return json({ liberada: false });

    const { data: av } = await db.from("documentation_v2_avaliacoes").select("dados, nota, confirmada, liberada").eq("response_id", resp.id).maybeSingle();
    if (!av || !av.confirmada || !av.liberada) return json({ liberada: false });

    const d: any = av.dados || {};

    // Revisão cruzada que a minha dupla RECEBEU (sem dizer quem revisou): 8 itens, sim=1, em parte=0,5, não=0, de 0 a 10.
    // Mesma regra de src/lib/doc-v2-nota.ts (as funções não importam de src/).
    const ITEM_EXTRA: Record<string, string> = { ram: "rv-ram", incidente: "rv-incidente" };
    const ITENS = ["rv-destino", "rv-sbar", "rv-cobertura", "rv-grade", "rv-linguagem", "rv-alertas", "rv-coerencia", "rv-usaria",
      ...(Array.isArray((sala as any).documentos_extra) ? (sala as any).documentos_extra : []).map((e: string) => ITEM_EXTRA[e]).filter(Boolean)];
    const { data: rev } = await db.from("documentation_v2_revisoes").select("answers_json")
      .eq("room_id", sala.id).eq("reviewed_pair", eu.pair_index).not("submitted_at", "is", null).maybeSingle();
    let revisaoNota: number | null = null;
    let revisaoComentario = "";
    if (rev?.answers_json) {
      const a: any = rev.answers_json;
      let soma = 0, ok = true;
      for (const id of ITENS) { if (a[id] === "sim") soma += 1; else if (a[id] === "parcial") soma += 0.5; else if (a[id] !== "nao") ok = false; }
      if (ok) revisaoNota = Math.round((soma / ITENS.length) * 10 * 100) / 100;
      revisaoComentario = typeof a.comentario === "string" ? a.comentario : "";
    }
    const rubrica = av.nota != null ? Number(av.nota) : null;
    const notaFinal = rubrica == null ? null : revisaoNota == null ? rubrica : 0.8 * rubrica + 0.2 * revisaoNota;

    return json({
      liberada: true,
      nota: rubrica,
      revisao_nota: revisaoNota,
      revisao_comentario: revisaoComentario,
      nota_final: notaFinal,
      criterios: d.respostas || {},
      justificativas: d.justificativas || {},
      comentario: d.comentario || "",
      alertas: Array.isArray(d.alertas) ? d.alertas : [],
    });
  } catch (e) {
    console.error("doc-v2-devolutiva error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
