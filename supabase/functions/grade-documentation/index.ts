import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Build a row representation using LABELS instead of column IDs.
// Student rows and answer-key rows can use DIFFERENT column IDs (form vs answer-key forms),
// but they share the same column LABELS. We map by label so the AI can compare them.
function rowToLabelMap(row: any, columns: any[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!row || typeof row !== "object") return out;
  for (const col of columns) {
    const val = row[col.id];
    out[col.label] = val == null || val === "" ? "(vazio)" : String(val);
  }
  return out;
}

// Try to find the value for a column label in a row whose keys are unknown column IDs.
// Falls back to scanning all values when label-based lookup fails.
function rowToLabelMapByAnyKey(row: any, studentColumns: any[], expectedLabels: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!row || typeof row !== "object") return out;

  // First: try matching student columns by label (exact)
  if (studentColumns.length > 0) {
    for (const label of expectedLabels) {
      const col = studentColumns.find((c: any) => (c.label || "").trim().toLowerCase() === label.trim().toLowerCase());
      if (col) {
        const v = row[col.id];
        out[label] = v == null || v === "" ? "(vazio)" : String(v);
      } else {
        out[label] = "(vazio)";
      }
    }
    return out;
  }

  // Fallback: just dump all values
  const values = Object.values(row).filter((v) => v != null && v !== "");
  expectedLabels.forEach((label, i) => {
    out[label] = values[i] != null ? String(values[i]) : "(vazio)";
  });
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { room_id, pair_index, referral_response, referral_answer_key, referral_fields, med_response, med_answer_key, med_columns } = await req.json();

    let comparisonPrompt = "Avalie as respostas do aluno comparando RIGOROSAMENTE com o espelho de respostas.\n\n";
    comparisonPrompt += "PONTUAÇÃO MÁXIMA:\n- Encaminhamento: 5,0 pontos\n- Quadro Resumo de Medicamentos: 5,0 pontos\n- Total: 10,0 pontos\n\n";

    // -------- REFERRAL --------
    if (referral_response && referral_answer_key) {
      let keyFields: any[] = [];
      if (referral_answer_key.case_answers) {
        const caseId = referral_response.clinical_case_id;
        if (caseId && referral_answer_key.case_answers[caseId]) keyFields = referral_answer_key.case_answers[caseId];
        else { const firstKey = Object.keys(referral_answer_key.case_answers)[0]; if (firstKey) keyFields = referral_answer_key.case_answers[firstKey]; }
      } else if (Array.isArray(referral_answer_key)) { keyFields = referral_answer_key; }

      const fields = Array.isArray(referral_fields) ? referral_fields : [];
      // Build label-indexed answer map so we can match student answers (by field id in student form)
      // against the key answers (which use different ids but same labels).
      const studentAnswers = referral_response.answers_json || {};
      const studentByLabel: Record<string, string> = {};
      fields.forEach((field: any) => {
        const v = studentAnswers[field.id];
        studentByLabel[(field.label || "").trim().toLowerCase()] =
          v == null || v === "" ? "(sem resposta)" : (typeof v === "object" ? JSON.stringify(v) : String(v));
      });

      comparisonPrompt += "## FICHA DE ENCAMINHAMENTO (máximo 5,0 pontos)\n\n";
      comparisonPrompt += "METODOLOGIA DE CORREÇÃO (LEIA COM ATENÇÃO):\n";
      comparisonPrompt += "PASSO 1 — EXTRAÇÃO: Para cada item, leia INTEGRALMENTE a RESPOSTA DO ALUNO e extraia uma lista dos elementos clínicos/técnicos que ele mencionou (medicamentos, doses, discrepâncias, interações, condutas, justificativas).\n";
      comparisonPrompt += "PASSO 2 — EXTRAÇÃO DO ESPELHO: Faça o mesmo com o ESPELHO ESPERADO, listando os elementos-chave esperados.\n";
      comparisonPrompt += "PASSO 3 — COMPARAÇÃO JUSTA: Marque cada elemento do espelho como ✓ presente na resposta do aluno (mesmo com palavras diferentes, desde que o conteúdo clínico seja equivalente) ou ✗ ausente. Sinônimos e paráfrases CONTAM como acerto (ex: 'omissão do omeprazol' = 'falta do omeprazol' = 'omeprazol não foi prescrito').\n";
      comparisonPrompt += "PASSO 4 — PONTUAÇÃO PROPORCIONAL: score = max_score × (elementos do espelho presentes na resposta / total de elementos do espelho). Arredonde para 0.25.\n";
      comparisonPrompt += "  • 100% se o aluno cobriu todos elementos-chave (mesmo com linguagem diferente).\n";
      comparisonPrompt += "  • 75% se cobriu a maioria, faltando 1 elemento secundário.\n";
      comparisonPrompt += "  • 50% se cobriu cerca da metade.\n";
      comparisonPrompt += "  • 25% se mencionou apenas 1 elemento ou foi muito superficial.\n";
      comparisonPrompt += "  • 0 apenas se ausente, totalmente incorreto, ou não relacionado.\n";
      comparisonPrompt += "- Ignore campos meramente identificadores (nome, data, sexo) — avalie apenas itens com max_score > 0.\n\n";
      comparisonPrompt += "REGRA DE OURO — COERÊNCIA OBRIGATÓRIA:\n";
      comparisonPrompt += "- ANTES de afirmar que algo 'faltou', releia a RESPOSTA DO ALUNO e CONFIRME que o termo ou conceito realmente NÃO aparece. Se aparecer (mesmo parafraseado), você DEVE creditar como acerto.\n";
      comparisonPrompt += "- É PROIBIDO dizer 'não identificou X' quando X aparece literalmente ou como sinônimo na resposta do aluno. Esse erro invalida a correção.\n";
      comparisonPrompt += "- Exemplo: se o espelho fala em 'omissão do Omeprazol' e o aluno escreve 'a omissão do omeprazol sem justificativa pode piorar...', isso É um acerto.\n\n";
      comparisonPrompt += "FORMATO DO FEEDBACK POR ITEM:\n";
      comparisonPrompt += "- ✓ Acertou: cite LITERALMENTE trechos da resposta do aluno que correspondem a elementos do espelho.\n";
      comparisonPrompt += "- ✗ Faltou: liste apenas elementos do espelho que REALMENTE não aparecem (nem como sinônimo) na resposta.\n";
      comparisonPrompt += "- ⚠ Divergiu: aponte erros técnicos com a versão correta.\n";
      comparisonPrompt += "- PROIBIDO frases vagas como 'resposta superficial', 'não abordou todos os aspectos'.\n\n";

      keyFields.forEach((keyField: any, idx: number) => {
        const labelKey = (keyField.label || "").trim().toLowerCase();
        const studentAnswer = studentByLabel[labelKey] || "(sem resposta)";
        const expectedAnswer = keyField.correct_answer || (keyField.options ? keyField.options.join(", ") : "") || "(sem espelho)";
        const maxScore = keyField.max_score || 0;
        if (maxScore <= 0) return;
        comparisonPrompt += `Item ${idx + 1}: "${keyField.label}" (máx ${maxScore} pts)\n`;
        comparisonPrompt += `  RESPOSTA DO ALUNO: ${studentAnswer}\n`;
        comparisonPrompt += `  ESPELHO ESPERADO: ${expectedAnswer}\n\n`;
      });
    }

    // -------- MEDICATION SUMMARY --------
    if (med_response && med_answer_key) {
      comparisonPrompt += "## QUADRO RESUMO DE MEDICAMENTOS (máximo 5,0 pontos)\n\n";
      let keyColumns: any[] = [];
      let expectedRows: any[] = [];
      let rowScore = 1;

      if (med_answer_key.case_answers) {
        const caseId = med_response.clinical_case_id;
        let caseData: any = null;
        if (caseId && med_answer_key.case_answers[caseId]) caseData = med_answer_key.case_answers[caseId];
        else { const firstKey = Object.keys(med_answer_key.case_answers)[0]; if (firstKey) caseData = med_answer_key.case_answers[firstKey]; }
        if (caseData) { keyColumns = caseData.columns || []; expectedRows = caseData.answer_rows || []; rowScore = caseData.rows_score || 1; }
      } else {
        keyColumns = med_answer_key.columns || [];
        expectedRows = med_answer_key.answer_rows || [];
        rowScore = med_answer_key.rows_score || 1;
      }

      // Student rows use the form's columns (different IDs), but same labels as keyColumns.
      const studentColumns = Array.isArray(med_columns) ? med_columns : [];
      const labels = keyColumns.map((c: any) => c.label);
      const studentRows = med_response.answers_json?.rows || [];

      comparisonPrompt += "INSTRUÇÕES DE CORREÇÃO:\n";
      comparisonPrompt += `- Cada linha correta vale ${rowScore} ponto(s). Nota máxima do quadro = 5,0.\n`;
      comparisonPrompt += "- Para cada medicamento do espelho, verifique se o aluno o incluiu e compare Dose, Via, Horário, Finalidade e Observações.\n";
      comparisonPrompt += "- Atribua nota proporcional por linha: 100% se todos os campos batem com o espelho; 60-80% se faltar 1-2 detalhes menores; 30-50% se faltar dose/via/horário; 0% se medicamento ausente ou completamente errado.\n";
      comparisonPrompt += "- Nota total do quadro = soma das notas das linhas, limitada a 5,0.\n";
      comparisonPrompt += "- IMPORTANTE: se o aluno enviou linhas (mesmo que com nomes de colunas diferentes), AVALIE-AS. Só diga 'não preencheu' se studentRows estiver realmente vazio.\n\n";

      comparisonPrompt += `Colunas avaliadas: ${labels.join(", ")}\n`;
      comparisonPrompt += `Pontuação por linha correta: ${rowScore} pts\n\n`;

      comparisonPrompt += `### RESPOSTAS DO ALUNO (${studentRows.length} linha(s)):\n`;
      if (studentRows.length === 0) {
        comparisonPrompt += "(nenhuma linha enviada)\n\n";
      } else {
        studentRows.forEach((row: any, i: number) => {
          const mapped = rowToLabelMapByAnyKey(row, studentColumns, labels);
          const parts = labels.map((l: string) => `${l}=${mapped[l] || "(vazio)"}`);
          comparisonPrompt += `  Linha ${i + 1}: ${parts.join(" | ")}\n`;
        });
      }

      comparisonPrompt += `\n### ESPELHO (${expectedRows.length} linha(s) esperadas):\n`;
      expectedRows.forEach((row: any, i: number) => {
        const mapped = rowToLabelMap(row, keyColumns);
        const parts = labels.map((l: string) => `${l}=${mapped[l] || "(vazio)"}`);
        comparisonPrompt += `  Linha ${i + 1}: ${parts.join(" | ")}\n`;
      });
      comparisonPrompt += "\n";
    }

    const { response } = await callAiWithFallback({
      messages: [
        {
          role: "system",
          content: `Você é um avaliador acadêmico RIGOROSO de Farmácia Clínica. Avalie as respostas dos alunos comparando criticamente com o espelho.

REGRAS DE PONTUAÇÃO:
- Ficha de Encaminhamento: 0 a 5,0 pontos. Some os pontos por item; nunca exceda 5,0.
- Quadro Resumo de Medicamentos: 0 a 5,0 pontos. Some os pontos por linha correta; nunca exceda 5,0.
- Nota total = referral_total + medication_score, máximo 10,0.

DIRETRIZES CRÍTICAS:
- Seja rigoroso: respostas vagas, incompletas ou imprecisas NÃO devem receber nota máxima.
- Compare elementos-chave do espelho um a um. Liste no feedback o que faltou ou divergiu.
- Para o quadro de medicamentos: SEMPRE avalie as linhas enviadas pelo aluno mesmo que os nomes das colunas internas sejam diferentes (use os labels apresentados no prompt).
- Se o aluno enviou linhas no quadro, NUNCA diga que ele "não preencheu" — avalie-as.
- Feedback deve ser técnico, específico e construtivo. PROIBIDO usar frases genéricas como "faltou incluir elementos-chave", "resposta superficial" ou "não abordou todos os aspectos" sem nomear quais. Sempre cite NOMINALMENTE (ex: nomes de medicamentos, doses, interações, condutas) os elementos do espelho que o aluno acertou, omitiu ou errou.
- Cada item do referral_items.feedback deve conter pelo menos 2 elementos específicos extraídos do espelho (medicamento, dose, interação, intervenção concreta).
- Retorne via tool call. Garanta referral_total <= 5.0, medication_score <= 5.0 e total_score = referral_total + medication_score.`,
        },
        { role: "user", content: comparisonPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "submit_grading",
          description: "Submit grading results",
          parameters: {
            type: "object",
            properties: {
              referral_items: { type: "array", items: { type: "object", properties: { field_id: { type: "string" }, score: { type: "number" }, feedback: { type: "string" } }, required: ["field_id", "score", "feedback"] } },
              referral_total: { type: "number", description: "Nota do encaminhamento (0-5)" },
              medication_score: { type: "number", description: "Nota do quadro resumo (0-5)" },
              medication_feedback: { type: "string", description: "Feedback detalhado do quadro de medicamentos: cite linha por linha o que estava certo/errado/faltando" },
              general_feedback: { type: "string" },
              total_score: { type: "number", description: "Soma de referral_total + medication_score (0-10)" },
            },
            required: ["referral_total", "medication_score", "total_score", "general_feedback", "medication_feedback"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "submit_grading" } },
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let grading: any = {};
    if (toolCall?.function?.arguments) grading = JSON.parse(toolCall.function.arguments);

    const referralScore = Math.min(Number(grading.referral_total) || 0, 5);
    const medicationScore = Math.min(Number(grading.medication_score) || 0, 5);

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (referral_response?.id) {
      const feedbackJson: Record<string, any> = {};
      (grading.referral_items || []).forEach((item: any) => { feedbackJson[item.field_id] = { score: item.score, feedback: item.feedback }; });
      await supabaseAdmin.from("documentation_responses").update({ ai_score: referralScore, ai_feedback_json: feedbackJson }).eq("id", referral_response.id);
    }

    if (med_response?.id) {
      await supabaseAdmin.from("documentation_responses").update({ ai_score: medicationScore, ai_feedback_json: { feedback: grading.medication_feedback || grading.general_feedback || "" } }).eq("id", med_response.id);
    }

    return new Response(JSON.stringify({
      referral_score: referralScore,
      medication_score: medicationScore,
      total_score: referralScore + medicationScore,
      general_feedback: grading.general_feedback || "",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("grade-documentation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
