import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadVpCase } from "../_shared/vp-cases.ts";
import {
  coberturaInformacoes,
  isCaseDataV2,
  resolveVersaoKey,
  type VpCaseData,
} from "../_shared/vp-case-schema.ts";

// Debrief do aluno (P15): o "caminho esperado" do caso, mostrado ao lado do que ele fez.
// O gabarito NUNCA sai antes da liberação do feedback: a função só responde se a nota do atendimento
// (própria ou de um colega do grupo) já foi liberada pelo docente. Casos sem gabarito (legados) devolvem available:false.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (d: unknown, s = 200) =>
    new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { class_virtual_patient_id, email } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!class_virtual_patient_id || !normalizedEmail) return json({ error: "Missing class_virtual_patient_id or email" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: session } = await supabase
      .from("virtual_patient_sessions")
      .select("id, group_id, patient_id")
      .eq("class_virtual_patient_id", class_virtual_patient_id)
      .ilike("student_email", normalizedEmail)
      .maybeSingle();
    if (!session) return json({ available: false });

    // Sessões que podem ter a nota: a própria e as do grupo (a nota do grupo é espelhada, mas confere nas duas).
    let sessionIds = [session.id];
    if (session.group_id) {
      const { data: siblings } = await supabase
        .from("virtual_patient_sessions")
        .select("id")
        .eq("group_id", session.group_id);
      sessionIds = [...new Set([session.id, ...((siblings || []).map((s: any) => s.id))])];
    }

    const { data: grades } = await supabase
      .from("virtual_patient_grades")
      .select("session_id, feedback_released, raw_ai_response")
      .in("session_id", sessionIds);
    const released = (grades || []).find((g: any) => g.feedback_released);
    if (!released) return json({ available: false, reason: "not_released" });

    const caseRec = await loadVpCase(session.patient_id);
    if (!caseRec || !isCaseDataV2(caseRec.case_data)) return json({ available: false, reason: "no_gabarito" });
    const cd = caseRec.case_data as VpCaseData;

    const { data: cvp } = await supabase
      .from("class_virtual_patients")
      .select("profession")
      .eq("id", class_virtual_patient_id)
      .maybeSingle();
    let key = resolveVersaoKey((cvp as any)?.profession);
    if (!cd.versoes[key]) key = Object.keys(cd.versoes)[0] as typeof key;
    const gab = cd.versoes[key]?.gabarito;
    if (!gab) return json({ available: false, reason: "no_gabarito" });

    // As informações que a correção considerou obtidas ficam na parte "[SERVIDOR]" da resposta gravada.
    // Notas anteriores a essa gravação não têm a lista: o debrief mostra o caminho esperado sem marcar o que foi obtido.
    // Para notas gravadas antes disso, a lista ainda está na resposta bruta da IA (argumentos da chamada da ferramenta).
    let obtidas: string[] | null = null;
    const raw = String((released as any).raw_ai_response || "");
    const idx = raw.lastIndexOf("[SERVIDOR] ");
    if (idx >= 0) {
      try {
        const parsed = JSON.parse(raw.slice(idx + "[SERVIDOR] ".length));
        if (Array.isArray(parsed?.informacoes_obtidas)) obtidas = parsed.informacoes_obtidas.map(String);
      } catch { /* tenta a resposta bruta */ }
    }
    if (obtidas === null) {
      try {
        const bruta = JSON.parse(idx >= 0 ? raw.slice(0, idx).trim() : raw);
        const args = bruta?.tool_calls?.[0]?.function?.arguments;
        const parsed = typeof args === "string" ? JSON.parse(args) : args;
        if (Array.isArray(parsed?.informacoes_obtidas)) obtidas = parsed.informacoes_obtidas.map(String);
      } catch { /* sem lista: o debrief mostra só o caminho esperado */ }
    }
    const set = new Set(obtidas || []);

    return json({
      available: true,
      profissao: key,
      // Com quem o aluno falou em cada encontro (a tela usa para rotular a conversa: prescritor, equipe, cuidador).
      encontros: (cd.versoes[key]?.encontros || []).map((e) => ({
        numero: e.numero,
        interlocutor: e.interlocutor,
        nome: e.persona_interlocutor?.nome ?? null,
      })),
      obtidas_disponivel: obtidas !== null,
      cobertura: obtidas !== null ? coberturaInformacoes(gab, obtidas) : null,
      informacoes: gab.informacoes_alvo.map((i) => ({
        id: i.id_informacao,
        descricao: i.descricao,
        importancia: i.importancia,
        obtida: obtidas !== null ? set.has(i.id_informacao) : null,
      })),
      problemas: gab.problemas_esperados,
      red_flags: gab.red_flags,
      conduta_esperada: gab.conduta_esperada,
      orientacoes_esperadas: gab.orientacoes_esperadas,
      encaminhamentos: gab.encaminhamentos,
      objetivos_aprendizagem: gab.objetivos_aprendizagem,
      referencias: gab.referencias,
    });
  } catch (err) {
    console.error("[VP-DEBRIEF] ERROR:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
