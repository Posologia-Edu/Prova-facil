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
      // Use AI to extract text from the PDF by sending it as a document
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        try {
          const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "Extract ALL text content from this PDF document. Return the complete text preserving structure, headings, and paragraphs. Do not summarize." },
                { role: "user", content: [
                  { type: "text", text: "Extract all text from this PDF:" },
                  { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } }
                ]}
              ],
            }),
          });
          if (extractResponse.ok) {
            const extractData = await extractResponse.json();
            extractedPdfText = extractData.choices?.[0]?.message?.content || "";
          }
        } catch (e) {
          console.error("PDF extraction error:", e);
        }
      }
    }

    const systemPrompt = `Você é um especialista em educação médica e simulações jurídicas clínicas. Você cria processos jurídicos simulados para fins educacionais em saúde.

Gere um processo jurídico simulado completo no seguinte formato JSON:

{
  "title": "Título do caso (nome do paciente fictício)",
  "process_content": "Texto completo do processo em Markdown incluindo: Cabeçalho do Tribunal, Número do Processo, Ação Penal, Relato dos Fatos, Fundamentação Jurídica, Denúncia, Lista de Provas, Anexo 1 (Depoimento do Médico), Anexo 2 (Prontuário Médico), Anexo 3 (Laudo Pericial), Anexo 4 (Depoimento do Paciente), Anexo 5 (Laudos de Exames)",
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
- Conter detalhes clínicos suficientes para discussão
- Ter fundamentação jurídica baseada no Código Penal e Código de Ética Médica
- Gerar personagens-testemunha com profissões relacionadas ao caso
- As instruções dos personagens devem orientar sobre como argumentar na perspectiva da especialidade`;

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
