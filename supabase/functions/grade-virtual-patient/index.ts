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

    // Fetch ALL messages from the conversation (full transcript across encounters)
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

    // Fetch MAI (may include multiple medications)
    const { data: maiData } = await supabase
      .from("virtual_patient_mai_scores")
      .select("mai_json, total_score")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch session/patient context
    const { data: sessionData } = await supabase
      .from("virtual_patient_sessions")
      .select("patient_id, module, current_encounter, status, student_name, student_email")
      .eq("id", session_id)
      .single();

    // Build full transcript (organized by encounter for clarity)
    const byEncounter: Record<number, typeof messages> = {};
    for (const m of messages) {
      const e = (m as any).encounter || 1;
      if (!byEncounter[e]) byEncounter[e] = [];
      byEncounter[e].push(m);
    }

    let transcript = "";
    for (const enc of Object.keys(byEncounter).sort()) {
      transcript += `\n=== ENCONTRO ${enc} ===\n`;
      for (const m of byEncounter[Number(enc)]) {
        const role = (m as any).role === "user" ? "ESTUDANTE" : "PACIENTE";
        transcript += `${role}: ${(m as any).content}\n`;
      }
    }

    const maiSummary = maiData
      ? `MAI preenchido pelo estudante:\n${JSON.stringify(maiData.mai_json, null, 2)}\n(Score bruto: ${maiData.total_score})`
      : "MAI NÃO foi preenchido pelo estudante.";

    const systemPrompt = `Você é um AGENTE CORRETOR PROFISSIONAL de simulações clínicas com pacientes virtuais para a disciplina de Farmacologia Aplicada / Cuidado Farmacêutico.

Sua missão é avaliar OBJETIVAMENTE a interação completa do estudante com o paciente virtual, considerando duas grandes áreas de competência:

═══════════════════════════════════════════════
A) QUALIDADE DA ANAMNESE (peso 60% — escala 0–6)
═══════════════════════════════════════════════
Avalie 6 dimensões profissionais (cada uma 0–1, com casas decimais):

1. **identificacao_acolhimento** — Apresentação do estudante, cumprimento, postura empática, confirmação de identidade do paciente, comunicação acessível (sem jargão).
2. **queixa_principal_hda** — Caracterização da queixa principal e história da doença atual: localização, intensidade (escala de dor), qualidade, duração, fatores de melhora/piora, irradiação, sintomas associados.
3. **historia_medicamentosa** — Investigação ATIVA de TODOS os medicamentos em uso (prescritos, OTC, fitoterápicos, suplementos), dose, posologia, há quanto tempo, adesão, automedicação prévia.
4. **antecedentes_comorbidades** — Doenças crônicas, cirurgias, hospitalizações, alergias medicamentosas e alimentares, antecedentes familiares relevantes.
5. **habitos_estilo_vida** — Tabagismo, etilismo, atividade física, dieta, sono, ocupação, gestação/lactação quando aplicável.
6. **escuta_raciocinio_clinico** — Capacidade de fazer perguntas abertas, escuta ativa, reformulação, hipóteses farmacoterapêuticas coerentes, identificação de problemas relacionados a medicamentos (PRM/RNM).

═══════════════════════════════════════════════
B) QUALIDADE DO PREENCHIMENTO MAI (peso 40% — escala 0–4)
═══════════════════════════════════════════════
Avalie 4 dimensões do uso do Medication Appropriateness Index (cada uma 0–1):

1. **mai_completude** — Todos os medicamentos relevantes identificados na anamnese foram avaliados? Nenhum esquecido?
2. **mai_coerencia_clinica** — As classificações (apropriado / marginal / inapropriado) são coerentes com as evidências clínicas e o caso? (Ex.: AINE em paciente com DRC deve ser "inapropriado".)
3. **mai_justificativa_critica** — O estudante demonstra raciocínio crítico ao classificar (mesmo implícito na coerência das respostas dos 10 critérios MAI)?
4. **mai_seguranca_paciente** — Identificação correta de problemas de segurança: interações graves, contraindicações, duplicidades, doses inadequadas para idade/função renal/hepática.

═══════════════════════════════════════════════
PENALIDADES CRÍTICAS DE SEGURANÇA (até –1,5 no total)
═══════════════════════════════════════════════
Liste em "flags_seguranca" e descontar:
- Recomendar/aceitar AINE em DRC, gestação avançada, úlcera ativa: –0,5 cada
- Não identificar interação grave (ex.: varfarina + AINE, IECA + AINE em idoso): –0,5 cada
- Opioide sem orientação de constipação/sedação: –0,3
- Ignorar alergia relatada: –0,5
- Não investigar gestação em mulher em idade fértil antes de prescrever: –0,3

═══════════════════════════════════════════════
REGRAS DE OUTPUT
═══════════════════════════════════════════════
- Responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem comentários).
- Cite EVIDÊNCIAS curtas do transcript ("o aluno perguntou: …" / "o aluno NÃO investigou …").
- Seja honesto: se a anamnese foi pobre, dê notas baixas.
- Se MAI não foi preenchido, zerar totalmente a seção B e sinalizar.

═══════════════════════════════════════════════
SCHEMA OBRIGATÓRIO (JSON)
═══════════════════════════════════════════════
{
  "subscores": {
    "identificacao_acolhimento": 0.0,
    "queixa_principal_hda": 0.0,
    "historia_medicamentosa": 0.0,
    "antecedentes_comorbidades": 0.0,
    "habitos_estilo_vida": 0.0,
    "escuta_raciocinio_clinico": 0.0,
    "mai_completude": 0.0,
    "mai_coerencia_clinica": 0.0,
    "mai_justificativa_critica": 0.0,
    "mai_seguranca_paciente": 0.0
  },
  "evidencias": {
    "anamnese": ["bullet com citação curta", "..."],
    "mai": ["bullet com citação ou observação", "..."]
  },
  "bonus_penalidades": {
    "comunicacao_empatica_bonus": 0.0,
    "erro_seguranca_penalidade": 0.0,
    "ignorou_alergia_penalidade": 0.0
  },
  "nota_anamnese_0a6": 0.0,
  "nota_mai_0a4": 0.0,
  "nota_final_0a10": 0.0,
  "nota_microlearning_0a5": 0.0,
  "feedback_resumido": "STRING única em markdown com 3-5 bullets iniciados por '- ' separados por \\n. NUNCA retorne array.",
  "orientacoes_melhoria": "STRING única em markdown com 3-5 bullets iniciados por '- ' separados por \\n. NUNCA retorne array.",
  "flags_seguranca": ["lista de problemas críticos identificados, ou vazio"]
}

CÁLCULO:
- nota_anamnese_0a6 = soma dos 6 subscores de anamnese (máx 6)
- nota_mai_0a4 = soma dos 4 subscores MAI (máx 4)
- nota_final_0a10 = nota_anamnese_0a6 + nota_mai_0a4 + bônus/penalidades (clamp 0–10)
- nota_microlearning_0a5 = nota_final_0a10 / 2 (uma casa decimal)`;

    const userContent = `[CONTEXTO DA SESSÃO]
Paciente virtual: ${sessionData?.patient_id || "?"}
Módulo: ${sessionData?.module || "?"}
Encontro atual: ${sessionData?.current_encounter || "?"}
Status: ${sessionData?.status || "?"}
Estudante: ${sessionData?.student_name || "—"} (${sessionData?.student_email || "—"})

[TRANSCRIPT COMPLETO DA INTERAÇÃO]
${transcript}

[MAI – MEDICATION APPROPRIATENESS INDEX]
${maiSummary}

Avalie agora seguindo rigorosamente o schema do system prompt.`;

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
      return new Response(JSON.stringify({ error: "AI grading failed", detail: errText }), {
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

    // Merge evidencias into orientacoes for richer feedback display
    let orientacoes = gradeResult.orientacoes_melhoria || "";
    if (gradeResult.evidencias) {
      const ev = gradeResult.evidencias;
      const evidLines: string[] = [];
      if (Array.isArray(ev.anamnese) && ev.anamnese.length) {
        evidLines.push("**Evidências — Anamnese:**");
        ev.anamnese.forEach((e: string) => evidLines.push(`- ${e}`));
      }
      if (Array.isArray(ev.mai) && ev.mai.length) {
        evidLines.push("\n**Evidências — MAI:**");
        ev.mai.forEach((e: string) => evidLines.push(`- ${e}`));
      }
      if (evidLines.length) {
        orientacoes = `${orientacoes}\n\n${evidLines.join("\n")}`.trim();
      }
    }

    // Upsert grade (overwrite if re-graded)
    const { data: existing } = await supabase
      .from("virtual_patient_grades")
      .select("id")
      .eq("session_id", session_id)
      .maybeSingle();

    const payload = {
      session_id,
      class_virtual_patient_id,
      subscores: gradeResult.subscores || {},
      bonus_penalidades: gradeResult.bonus_penalidades || {},
      nota_final: gradeResult.nota_final_0a10 || 0,
      nota_microlearning: gradeResult.nota_microlearning_0a5 || 0,
      feedback_resumido: gradeResult.feedback_resumido || "",
      orientacoes_melhoria: orientacoes,
      flags_seguranca: gradeResult.flags_seguranca || [],
    };

    if (existing?.id) {
      await supabase.from("virtual_patient_grades").update(payload).eq("id", existing.id);
    } else {
      const { error: insertErr } = await supabase.from("virtual_patient_grades").insert(payload);
      if (insertErr) console.error("Failed to save grade:", insertErr);
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
