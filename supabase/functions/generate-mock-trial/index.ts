import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { learningObjectives, pdfBase64, pdfContent, caseNumber } = await req.json();

    // If PDF was uploaded as base64, decode and extract text
    let extractedPdfText = pdfContent || "";
    if (pdfBase64 && !extractedPdfText) {
      try {
        const { response: extractResponse } = await callAiWithFallback({
          messages: [
            { role: "system", content: "Extract ALL text content from this PDF document. Return the complete text preserving structure, headings, and paragraphs. Do not summarize." },
            { role: "user", content: [
              { type: "text", text: "Extract all text from this PDF:" },
              { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } }
            ] as any}
          ],
        });
        if (extractResponse.ok) {
          const extractData = await extractResponse.json();
          extractedPdfText = extractData.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("PDF extraction error:", e);
      }
    }

    const systemPrompt = `Você é um especialista em educação médica e simulações jurídicas clínicas. Você cria processos jurídicos simulados para fins educacionais em saúde.

Gere um processo jurídico simulado completo no seguinte formato JSON:

{
  "title": "Título do caso (nome do paciente fictício)",
  "process_content": "Texto completo do processo em Markdown contendo OBRIGATORIAMENTE TODAS as seções a seguir, nesta ordem e com estes títulos exatos em Markdown:\n\n# PROCESSO CLÍNICO [número]\n\n## CABEÇALHO DO TRIBUNAL\n(Tribunal de Justiça do Estado, Vara, Comarca)\n\n## NÚMERO DO PROCESSO\n\n## AÇÃO PENAL\n(Ex.: Ação Penal por Erro Médico)\n\n## RELATO DOS FATOS\n(Narrativa detalhada do caso clínico — paciente, contexto, conduta médica adotada, desfecho)\n\n## FUNDAMENTAÇÃO JURÍDICA\n(Artigos do Código Penal, Código de Ética Médica, CDC quando aplicável)\n\n## DENÚNCIA\n(Texto formal da denúncia do Ministério Público)\n\n## LISTA DE PROVAS\n(Numerada: prontuário, laudos, depoimentos, exames)\n\n## ANEXO 1 — DEPOIMENTO DO MÉDICO\n## ANEXO 2 — PRONTUÁRIO MÉDICO\n## ANEXO 3 — LAUDO PERICIAL\n## ANEXO 4 — DEPOIMENTO DO PACIENTE (ou familiares)\n## ANEXO 5 — LAUDOS DE EXAMES\n\n---\n\n## ARGUMENTAÇÃO A SER AVALIADA PELO JÚRI\n\n### Pela Acusação\n- (4 a 6 bullets com argumentos clínicos/científicos específicos que a acusação deve sustentar — riscos não mitigados, diretrizes descumpridas, complicações possíveis)\n\n### Pela Defesa\n- (4 a 6 bullets com argumentos clínicos/científicos específicos que a defesa deve sustentar — racional da conduta, segurança, alternativas razoáveis)\n\n---\n\n## REFERÊNCIAS SUGERIDAS AOS JURADOS\n- (Lista de 4 a 6 referências reais e pertinentes: diretrizes, sociedades, protocolos, artigos)\n\n---\n\n## INSTRUÇÃO AOS PARTICIPANTES\nO júri deverá considerar:\n- (4 a 6 bullets sobre os critérios de julgamento: gravidade do quadro, evidências disponíveis, segurança do paciente, adequação da conduta, etc.)",
  "characters": [
    {
      "side": "defense",
      "name": "Nome completo",
      "profession": "Especialidade médica",
      "instructions": "Instruções detalhadas para a testemunha de defesa, incluindo como se comportar, que argumentos usar, e como fundamentar clinicamente"
    },
    {
      "side": "prosecution", 
      "name": "Nome completo",
      "profession": "Especialidade médica",
      "instructions": "Instruções detalhadas para a testemunha de acusação, incluindo como se comportar, que argumentos usar, e como fundamentar clinicamente"
    }
  ]
}

O processo deve:
- Ser realista e educativo
- Conter detalhes clínicos suficientes para discussão (sintomas, exames, condutas, dosagens)
- Ter fundamentação jurídica baseada no Código Penal e Código de Ética Médica
- Gerar personagens-testemunha com profissões relacionadas ao caso
- As instruções dos personagens devem orientar sobre como argumentar na perspectiva da especialidade
- INCLUIR OBRIGATORIAMENTE, ao final do process_content, as seções "ARGUMENTAÇÃO A SER AVALIADA PELO JÚRI" (com sub-seções "Pela Acusação" e "Pela Defesa" em formato de bullets), "REFERÊNCIAS SUGERIDAS AOS JURADOS" e "INSTRUÇÃO AOS PARTICIPANTES", conforme estrutura especificada. Estas seções são essenciais para a condução do júri.`;

    const userPrompt = `Objetivos de Aprendizagem: ${learningObjectives || "Não especificados"}
Número do Processo: ${caseNumber || "001/2025"}
${extractedPdfText ? `\nConteúdo de referência da aula (PDF):\n${extractedPdfText}` : ""}

Gere o processo completo em formato JSON.`;

    const { response } = await callAiWithFallback({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "google/gemini-3-flash-preview",
      tools: [
        {
          type: "function",
          function: {
            name: "generate_mock_trial_case",
            description: "Generate a complete mock trial case",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                process_content: { type: "string" },
                characters: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      side: { type: "string", enum: ["defense", "prosecution"] },
                      name: { type: "string" },
                      profession: { type: "string" },
                      instructions: { type: "string" },
                    },
                    required: ["side", "name", "profession", "instructions"],
                  },
                },
              },
              required: ["title", "process_content", "characters"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "generate_mock_trial_case" } },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    let result;
    
    if (data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const args = data.choices[0].message.tool_calls[0].function.arguments;
      result = typeof args === "string" ? JSON.parse(args) : args;
    } else if (data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    }

    if (!result) throw new Error("Could not parse AI response");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-mock-trial error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
