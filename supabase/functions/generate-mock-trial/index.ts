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
- A perícia NÃO deve concluir de forma categórica que houve erro: deve listar prós e contras da conduta.
- O depoimento da vítima deve trazer queixas legítimas, mas também elementos que favoreçam a defesa.
- O depoimento do réu deve trazer justificativa clínica plausível, mas também pontos vulneráveis.
- Vencer o julgamento deve depender da QUALIDADE DA ARGUMENTAÇÃO e do USO ESTRATÉGICO DAS PROVAS.

DIVERSIDADE OBRIGATÓRIA DO RÉU (MULTIPROFISSIONAL):
- O réu NÃO precisa ser sempre médico. VARIE entre profissões da saúde de acordo com a natureza do erro/conduta:
  · Erro de prescrição/diagnóstico → médico(a)
  · Erro de administração de medicamento, troca de paciente, falha de monitoramento, omissão de cuidado, registro inadequado → enfermeiro(a) ou técnico(a) de enfermagem
  · Erro de dispensação, troca de fármaco, falha de conciliação medicamentosa, manipulação inadequada, ausência de orientação farmacêutica → farmacêutico(a)
  · Erro técnico em procedimento odontológico → cirurgião(ã)-dentista
  · Falha em mobilização, manobra ou conduta inadequada em reabilitação → fisioterapeuta
  · Orientação nutricional inadequada em paciente de risco → nutricionista
  · Falha em laudo, troca de amostra, erro analítico → biomédico(a) / farmacêutico(a) bioquímico(a)
- Use os OBJETIVOS DE APRENDIZAGEM e o CONTEÚDO DO PDF para escolher a profissão do réu de forma coerente. Quando os objetivos derem margem, PRIORIZE profissões NÃO-médicas para diversificar — o módulo precisa cobrir toda a equipe de saúde, não apenas o(a) médico(a).
- O artigo de Código de Ética citado na fundamentação deve ser o da profissão do réu (CFM, COFEN, CFF, CFO, COFFITO, CFN, CFBM etc.).
- O perito do Anexo 5 deve ser da MESMA profissão do réu (registro profissional compatível).

PERSONAGENS = TESTEMUNHAS TÉCNICAS (NÃO É O RÉU):
- O campo "characters" representa TESTEMUNHAS TÉCNICAS que serão acionadas pela acusação ou pela defesa para fortalecer a argumentação. NÃO são o réu nem a vítima.
- Cada testemunha deve ter ESPECIALIDADE/FORMAÇÃO ESTRATEGICAMENTE PERTINENTE ao caso, escolhida para REFORÇAR a tese do lado que a convoca.
  · Exemplo (ITU em gestante): defesa convoca um(a) OBSTETRA (ênfase em segurança materno-fetal, antibióticos seguros na gestação); acusação convoca um(a) INFECTOLOGISTA (ênfase em potência antimicrobiana, risco de pielonefrite, resistência bacteriana).
  · Exemplo (erro de dispensação em pediatria): defesa convoca um(a) FARMACÊUTICO(A) CLÍNICO(A) HOSPITALAR (ênfase em sistemas de dupla checagem, sobrecarga de trabalho); acusação convoca um(a) PEDIATRA (ênfase em gravidade do desfecho, estreita janela terapêutica).
  · Exemplo (erro de administração EV pela enfermagem): defesa convoca um(a) ENFERMEIRO(A) GESTOR(A) (ênfase em protocolos institucionais, condições de trabalho); acusação convoca um(a) FARMACOLOGISTA CLÍNICO(A) (ênfase em incompatibilidades e segurança).
- A escolha das especialidades deve ser DELIBERADA: a testemunha de cada lado precisa naturalmente trazer argumentos que ajudam aquele lado, mas SEM ser caricata.
- As "instructions" de cada testemunha devem orientar o aluno a explorar os pontos do prontuário, laudos e perícia que sustentam a tese do seu lado, citando diretrizes/conceitos pertinentes à sua especialidade.

Gere um processo jurídico simulado completo no seguinte formato JSON:

{
  "title": "Título curto do caso (ex.: nome do paciente fictício + condição clínica)",
  "process_content": "Texto completo do processo em Markdown RICO (use ## para títulos de seção, ### para subtítulos do prontuário, **negrito**, listas com -, tabelas em Markdown para antibiogramas/hemogramas, --- para separar anexos), seguindo EXATAMENTE esta estrutura e ordem:\n\n## Tribunal de Justiça [da Faculdade/Curso/Instituição fictícia]\n## Vara Criminal da Comarca [...]\n\n**Processo nº**: [número]\n**Ação Penal Pública**\n\n**Autor**: Ministério Público [...]\n**Réu**: [Nome fictício do profissional + profissão + identificação acadêmica entre parênteses, ex.: 'Enf. Fulana (Aluno X)']\n**Vítima**: [Nome do paciente fictício + identificação acadêmica entre parênteses, ex.: 'Paciente Beltrano (Aluno Y)']\n\n## Relato dos Fatos\n[Narrativa neutra do caso clínico — paciente, contexto, conduta adotada por TODOS os profissionais envolvidos, desfecho. Inclua elementos ambíguos.]\n\n## Fundamentação Jurídica\n- **Código Penal:** (artigos pertinentes)\n- **Código de Ética [da profissão do réu]:** (artigos pertinentes — use CFM/COFEN/CFF/CFO/COFFITO/CFN/CFBM conforme o réu)\n\n## Denúncia\n[Texto formal da denúncia do MP, narrando a conduta sob ótica acusatória — sem exageros.]\n\n## Provas\n- Depoimento do Réu (Anexo 1)\n- Prontuário do Paciente (Anexo 2)\n- Laudo de Exame (Anexo 3)\n- Depoimento da Vítima (Anexo 4)\n- Perícia Técnica (Anexo 5)\n\n---\n\n## ANEXO 1 — Depoimento do Réu\n[Em primeira pessoa, justificativa clínica plausível, reconhecendo limitações mas defendendo a racionalidade da conduta. Munição REAL para a defesa.]\n\n---\n\n## ANEXO 2 — Prontuário do Paciente\n### Identificação do Paciente\n(nome, idade, DN, nº prontuário, dados relevantes)\n### Histórico Médico\n(comorbidades, alergias, medicações em uso)\n### Queixa Principal\n### Exame Físico\n(sinais vitais, achados)\n### Exames Complementares\n(resultados detalhados — use tabelas Markdown quando pertinente)\n### Diagnóstico\n### Conduta\n(cronologia datada e horária — prescrições, administrações, dispensações, retornos. PEÇA-CHAVE de provas.)\n### Evolução\n(desfecho, alta, complicações)\n[Inclua dados ambíguos.]\n\n---\n\n## ANEXO 3 — Laudo de Exame\n[Laboratório fictício, identificação, material, datas, resultado COMPLETO com TABELA Markdown quando pertinente (antibiograma, hemograma). Interpretação técnica neutra.]\n\n---\n\n## ANEXO 4 — Depoimento da Vítima\n[Em primeira pessoa, queixas legítimas, MAS com elementos que a defesa possa explorar.]\n\n---\n\n## ANEXO 5 — Laudo de Perícia Técnica\n**Processo nº:** [...]\n**Perito:** [Nome fictício + registro profissional DA MESMA PROFISSÃO DO RÉU + especialidade]\n**Periciando:** [...]\n**Data da Perícia:** [...]\n\n**Quesitos:** (3 a 5 perguntas técnicas)\n\n**Exame do Periciando:** (metodologia)\n\n**Discussão:** [EQUILIBRADA]\n\n**Conclusão:** [PONDERADA — nunca categórica]\n\n**Assinatura do Perito / Registro / Data**",
  "characters": [
    {
      "side": "defense",
      "name": "Nome completo fictício",
      "profession": "Especialidade DELIBERADAMENTE escolhida para favorecer a defesa neste caso específico",
      "instructions": "Instruções para a TESTEMUNHA TÉCNICA da defesa (NÃO é o réu): postura profissional, argumentos clínicos plausíveis baseados na sua especialidade, diretrizes/conceitos a citar, pontos do prontuário/laudos/perícia que deve explorar a favor do réu. Defesa TÉCNICA e DEFENSÁVEL."
    },
    {
      "side": "prosecution",
      "name": "Nome completo fictício",
      "profession": "Especialidade DELIBERADAMENTE escolhida para favorecer a acusação neste caso específico",
      "instructions": "Instruções para a TESTEMUNHA TÉCNICA da acusação (NÃO é o réu nem a vítima): postura profissional, argumentos clínicos plausíveis baseados na sua especialidade, diretrizes/conceitos a citar, pontos do prontuário/laudos/perícia que deve explorar contra o réu. Acusação TÉCNICA e DEFENSÁVEL."
    }
  ]
}

REGRAS FINAIS:
- Siga ESTRITAMENTE a estrutura: Cabeçalho → Autor → Réu → Vítima → Relato dos Fatos → Fundamentação Jurídica → Denúncia → Provas → Anexo 1 → Anexo 2 → Anexo 3 → Anexo 4 → Anexo 5.
- Use Markdown rico (##, ###, **, listas, tabelas, ---).
- VARIE a profissão do réu — não escolha médico por padrão.
- As testemunhas (characters) NÃO são o réu; são especialistas chamados estrategicamente para depor.
- Não inclua seções de "Argumentação para Acusação/Defesa" no corpo do processo.`;

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
