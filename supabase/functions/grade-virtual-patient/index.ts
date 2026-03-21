import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, class_virtual_patient_id } = await req.json();

    if (!session_id || !class_virtual_patient_id) {
      return new Response(JSON.stringify({ error: "Missing session_id or class_virtual_patient_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch messages
    const { data: messages, error: msgErr } = await supabase
      .from("virtual_patient_messages")
      .select("role, content, encounter")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });

    if (msgErr || !messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages found for session" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch MAI
    const { data: maiData } = await supabase
      .from("virtual_patient_mai_scores")
      .select("mai_json, total_score")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build transcript
    const transcript = messages
      .map((m: any) => `[Encontro ${m.encounter}] ${m.role === "user" ? "ESTUDANTE" : "PACIENTE"}: ${m.content}`)
      .join("\n\n");

    const maiSummary = maiData
      ? `MAI preenchido: ${JSON.stringify(maiData.mai_json)} (Score total: ${maiData.total_score})`
      : "MAI não preenchido.";

    const systemPrompt = `Você é um avaliador objetivo para a disciplina Farmacologia Aplicada.

Sua tarefa é ler o TRANSCRIPT do aluno com o paciente virtual e o RESUMO FINAL do aluno, e emitir NOTA e FEEDBACK conforme a RUBRICA abaixo.

RUBRICA (0–10):

1) Anamnese estruturada (0–2) → queixa principal, HDA, comorbidades, medicações, impacto funcional/sono.
2) Plano inicial coerente (0–2) → farmacológico adequado + não farmacológico, com lógica e justificativa.
3) Exames e justificativa (0–2) → pertinência dos exames solicitados e explicação de relevância.
4) Reavaliação e ajustes (0–2) → interpretação da evolução clínica + ajustes corretos de conduta.
5) MAI consistente (0–2) → aplicação crítica do Medication Appropriateness Index.

BÔNUS/PENALIDADES (±1 no máximo):
+0,5 → integra risco/benefício e preferências do paciente.
–0,5 → erro de segurança relevante (ex.: AINE sistêmico em DRC, opioide sem manejo de efeitos adversos).
–0,5 → ignorar dados novos trazidos na evolução.

REGRAS:
- Seja conciso, específico e objetivo.
- Sempre devolva um JSON válido seguindo o SCHEMA abaixo.
- Cite pequenas evidências do transcript quando possível ("o aluno disse…").
- Se faltar informação, penalize justificando.
- Se houver erro grave de segurança, liste em flags_seguranca.

SCHEMA DE SAÍDA (JSON):
{
  "subscores": {
    "anamnese": 0.0,
    "plano_inicial": 0.0,
    "exames": 0.0,
    "reavaliacao_ajustes": 0.0,
    "mai": 0.0
  },
  "bonus_penalidades": {
    "integracao_risco_beneficio_preferencias": 0.0,
    "erro_seguranca": 0.0,
    "ignorou_dados_evolucao": 0.0
  },
  "nota_final_0a10": 0.0,
  "nota_microlearning_0a5": 0.0,
  "feedback_resumido": "3-5 bullets curtos",
  "orientacoes_melhoria": "lista curta de ações práticas",
  "flags_seguranca": []
}

CÁLCULO:
- Some os 5 itens (0–10), aplique bônus/penalidades sem ultrapassar 10.
- Converta para microlearning (0–5) dividindo por 2 (arredonde para 0,1).`;

    const userContent = `[TRANSCRIPT]\n${transcript}\n\n[RESUMO_FINAL_DO_ALUNO]\n${maiSummary}`;

    const { response } = await callAiWithFallback({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", errText);
      return new Response(JSON.stringify({ error: "AI grading failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from potential markdown code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) content = jsonMatch[1].trim();

    let gradeResult: any;
    try {
      gradeResult = JSON.parse(content);
    } catch {
      console.error("Failed to parse grade JSON:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI grade response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save grade
    const { error: insertErr } = await supabase.from("virtual_patient_grades").insert({
      session_id,
      class_virtual_patient_id,
      subscores: gradeResult.subscores || {},
      bonus_penalidades: gradeResult.bonus_penalidades || {},
      nota_final: gradeResult.nota_final_0a10 || 0,
      nota_microlearning: gradeResult.nota_microlearning_0a5 || 0,
      feedback_resumido: gradeResult.feedback_resumido || "",
      orientacoes_melhoria: gradeResult.orientacoes_melhoria || "",
      flags_seguranca: gradeResult.flags_seguranca || [],
    });

    if (insertErr) {
      console.error("Failed to save grade:", insertErr);
    }

    return new Response(JSON.stringify({ success: true, grade: gradeResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Grade error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
