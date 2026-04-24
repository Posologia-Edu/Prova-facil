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

    const systemPrompt = `Você é um especialista em educação em saúde e simulações jurídicas clínicas. Você cria processos jurídicos simulados para fins educacionais, seguindo ESTRITAMENTE a estrutura abaixo (modelo de referência: processo de erro/condução clínica em formato de Ação Penal Pública).

PRINCÍPIO FUNDAMENTAL DE NEUTRALIDADE (OBRIGATÓRIO):
- O processo NÃO PODE tendenciar para a acusação nem para a defesa.
- Os fatos, depoimentos, prontuário, laudos e perícia devem conter elementos AMBÍGUOS e ARGUMENTOS PARA OS DOIS LADOS de forma equilibrada.
- A perícia NÃO deve concluir de forma categórica que houve erro: deve listar prós e contras da conduta, contextos em que seria aceitável e contextos em que seria criticável.
- O depoimento da vítima/autor deve trazer queixas legítimas, mas também reconhecer fatos que possam favorecer a defesa (ex.: melhora inicial, demora em retornar, adesão parcial).
- O depoimento do réu deve trazer justificativa clínica plausível, mas também reconhecer pontos vulneráveis (ex.: possibilidade de ter agido diferente).
- O prontuário deve conter dados que ambos os lados possam EXPLORAR ESTRATEGICAMENTE.
- Vencer o julgamento deve depender da QUALIDADE DA ARGUMENTAÇÃO e do USO ESTRATÉGICO DAS PROVAS, não da obviedade do desfecho.

Gere um processo jurídico simulado completo no seguinte formato JSON:

{
  "title": "Título curto do caso (ex.: nome do paciente fictício + condição clínica)",
  "process_content": "Texto completo do processo em Markdown seguindo EXATAMENTE esta estrutura, nesta ordem, com estes títulos:\n\n**Tribunal de Justiça [da Faculdade/Curso/Instituição fictícia adequada à área]**\n\n**Vara Criminal da Comarca [...]**\n\n**Processo nº**: [número informado]\n\n**Ação Penal Pública**\n\n**Autor**: Ministério Público [...]\n\n**Réu**: [Nome do profissional fictício + identificação acadêmica entre parênteses, ex.: 'Dr. Fulano (Aluno X)']\n\n**Vítima**: [Nome do paciente fictício + identificação acadêmica entre parênteses, ex.: 'Paciente Beltrano (Aluno Y)']\n\n**Relato dos Fatos:**\n[Narrativa neutra do caso clínico — paciente, contexto, conduta adotada, desfecho — SEM julgamentos de valor, apenas fatos. Inclua elementos que podem ser interpretados de formas opostas.]\n\n**Fundamentação Jurídica:**\n- **Código Penal:** (artigos pertinentes, ex.: Art. 132, Art. 121)\n- **Código de Ética [da profissão]:** (artigos pertinentes)\n\n**Denúncia**\n[Texto formal da denúncia do Ministério Público, em parágrafos, narrando a conduta sob a ótica acusatória — mas SEM exageros que tornem a defesa inviável.]\n\n**Provas:**\n- Depoimento do [Réu] (Anexo 1)\n- Prontuário Médico (Anexo 2)\n- Laudo de Exame [específico do caso] (Anexo 3)\n- Depoimento do Paciente/Vítima (Anexo 4)\n- Perícia Médica (Anexo 5)\n\n---\n\n**ANEXO 1 — Depoimento do [Réu]**\n[Depoimento em primeira pessoa, com justificativa clínica plausível para a conduta, reconhecendo limitações mas defendendo a racionalidade da decisão. Deve dar munição REAL para a defesa.]\n\n---\n\n**ANEXO 2 — Prontuário Médico**\n### Identificação do Paciente: (nome, DN, nº prontuário)\n### Histórico Médico: (comorbidades, alergias, medicações em uso)\n### Queixa Principal: (sintomas detalhados)\n### Exame Físico: (sinais vitais, achados)\n### Exames Complementares: (resultados detalhados — laboratoriais, imagem, etc.)\n### Diagnóstico:\n### Conduta: (cronologia datada de prescrições, retornos, decisões — DETALHADA, pois é a principal fonte de provas para os dois lados)\n### Evolução: (desfecho, alta, complicações)\n[Inclua dados ambíguos: ex. melhora inicial seguida de piora, adesão duvidosa, atrasos, sinais que poderiam ou não ter sido valorizados.]\n\n---\n\n**ANEXO 3 — Laudo de Exame [específico]**\n[Laboratório fictício, identificação do paciente, material, datas, resultado COMPLETO com tabela em Markdown quando pertinente (ex.: antibiograma, hemograma, imagem). Interpretação técnica neutra. Recomendação técnica baseada em evidência, sem culpabilizar ninguém.]\n\n---\n\n**ANEXO 4 — Depoimento do Paciente/Vítima**\n[Depoimento em primeira pessoa, com queixas legítimas e sofrimento relatado, MAS também com elementos que a defesa possa explorar — ex.: 'senti melhora inicial', 'demorei a retornar', 'esqueci uma dose', 'não informei tal alergia de imediato', etc.]\n\n---\n\n**ANEXO 5 — Laudo de Perícia [profissional adequado]**\n**Processo nº:** [...]\n**Perito:** [Nome fictício + registro profissional + especialidade]\n**Periciando:** [...]\n**Data da Perícia:** [...]\n**Quesitos:** (3 a 5 perguntas técnicas pertinentes)\n**Exame do Periciando:** (metodologia: análise de prontuário, exames, literatura)\n**Discussão:**\n[Discussão EQUILIBRADA: aponta o que a literatura recomenda, mas também reconhece situações clínicas em que a conduta adotada poderia ser defensável. Cita variáveis que dificultam a tomada de decisão.]\n**Conclusão:**\n[Conclusões PONDERADAS para cada quesito, evitando 'sim categórico' ou 'não categórico'. Use formulações como 'parcialmente em desacordo', 'há elementos que sustentam ambas as interpretações', 'a conduta foge da diretriz padrão, porém pode ser justificada em [contexto X]'. NUNCA conclua de forma a tornar o júri óbvio.]\n**Assinatura do Perito / CRM/CRF/COREN / Data**\n\n---\n\nIMPORTANTE: Use Markdown limpo (negrito com **, títulos com ## quando apropriado, tabelas em Markdown para resultados de exames). NÃO inclua seções de 'Argumentação para Acusação/Defesa', 'Referências aos Jurados' ou 'Instrução aos Participantes' — o objetivo é que os alunos CONSTRUAM essa argumentação a partir das provas.",
  "characters": [
    {
      "side": "defense",
      "name": "Nome completo fictício",
      "profession": "Profissão/Especialidade pertinente ao caso",
      "instructions": "Instruções para a testemunha de defesa: como se comportar, argumentos clínicos plausíveis a sustentar, pontos do prontuário/laudos/perícia que deve explorar a favor do réu. Deve ser uma defesa TÉCNICA e DEFENSÁVEL, não fantasiosa."
    },
    {
      "side": "prosecution",
      "name": "Nome completo fictício",
      "profession": "Profissão/Especialidade pertinente ao caso",
      "instructions": "Instruções para a testemunha de acusação: como se comportar, argumentos clínicos a sustentar, pontos do prontuário/laudos/perícia que deve explorar contra o réu. Deve ser uma acusação TÉCNICA e DEFENSÁVEL, não fantasiosa."
    }
  ]
}

REGRAS FINAIS:
- Siga ESTRITAMENTE a estrutura do modelo de referência: Cabeçalho → Autor → Réu → Vítima → Relato dos Fatos → Fundamentação Jurídica → Denúncia → Provas (lista) → Anexo 1 (Depoimento Réu) → Anexo 2 (Prontuário) → Anexo 3 (Laudos/Exames) → Anexo 4 (Depoimento Vítima) → Anexo 5 (Perícia).
- O Prontuário (Anexo 2) deve ser DETALHADO, com cronologia datada — é a peça-chave de provas.
- Cada anexo deve ter dados que possam ser EXPLORADOS pelos dois lados.
- Adapte a profissão do réu, o tipo de laudo e o perito à área indicada nos objetivos de aprendizagem (medicina, farmácia, enfermagem, odontologia, etc.).
- Se a área não for explícita, infira a partir dos objetivos.`;

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
