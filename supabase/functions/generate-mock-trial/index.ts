import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Generate a medical image (X-ray, CT, ECG, etc.) via Lovable AI image model.
// Returns a data:image/png;base64,... URL or null on failure.
async function generateMedicalImage(prompt: string): Promise<string | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: `Generate a HIGHLY REALISTIC medical imaging exam, as if it were officially issued by a hospital radiology/diagnostic department. The image must look authentic — proper grayscale for radiology (X-ray/CT/MRI), proper colors and grid for ECG, proper microscopy appearance for histology, etc. Include realistic patient header markers (laterality L/R, anatomical orientation), institutional watermark area, and visible diagnostic findings that match the description. NO captions, NO text overlays explaining the finding — the image should require interpretation. Description: ${prompt}`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });
    if (!resp.ok) {
      console.error("Image gen failed:", resp.status, await resp.text());
      return null;
    }
    const data = await resp.json();
    const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return url || null;
  } catch (e) {
    console.error("generateMedicalImage error:", e);
    return null;
  }
}

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

    const systemPrompt = `Você é um especialista em educação em saúde, medicina forense e simulações jurídicas clínicas de ALTÍSSIMA COMPLEXIDADE. Você cria processos jurídicos simulados em formato de Ação Penal Pública para fins educacionais universitários.

═══════════════════════════════════════════════════════════
NÍVEL DE EXIGÊNCIA: PROCESSO JUDICIAL REAL E DENSO
═══════════════════════════════════════════════════════════

Este processo será usado por alunos de graduação em saúde em sessões de Júri Simulado de 60-90 minutos. Eles PRECISAM ter material rico para extrair argumentos, contradições, easter eggs clínicos e detalhes técnicos. Processos curtos e superficiais TORNAM A ATIVIDADE INÚTIL. Cada peça do processo deve parecer EMITIDA POR UMA INSTITUIÇÃO REAL.

PRINCÍPIO FUNDAMENTAL DE NEUTRALIDADE:
- O processo NÃO PODE tendenciar para acusação nem defesa.
- Provas e depoimentos contêm elementos AMBÍGUOS e MUNIÇÃO PARA OS DOIS LADOS.
- Vencer depende da QUALIDADE DA ARGUMENTAÇÃO + CAPACIDADE DE LER ENTRELINHAS.

PRINCÍPIO DOS "EASTER EGGS" CLÍNICOS (OBRIGATÓRIO):
- Espalhe pelos depoimentos e prontuário PEQUENOS DETALHES TÉCNICOS aparentemente irrelevantes que, se identificados pelo aluno atento, podem virar o jogo.
- Exemplos: uma alergia mencionada de passagem em um depoimento mas omitida no prontuário; um horário de administração que conflita com o horário de uma evolução; um valor laboratorial fora da referência mas não destacado; uma medicação citada pelo paciente que não consta na prescrição; uma checagem de identificação não documentada; um intervalo de tempo entre duas condutas suspeitamente curto; uma assinatura ausente; um carimbo de outro plantonista.
- Mínimo de 8-12 easter eggs distribuídos pelo processo. Eles devem ser PLAUSÍVEIS, não óbvios, e relevantes para a tese de algum lado.

PRINCÍPIO DO PLOT TWIST NA EVOLUÇÃO:
- A evolução do paciente DEVE conter uma reviravolta. O leitor pensa "caso fácil, conduta clara" → mas então surge uma complicação inesperada, um achado novo, um exame que muda tudo, ou uma informação anamnética que apareceu tardiamente.
- A reviravolta deve ser CLINICAMENTE PLAUSÍVEL e fundamentada (ex: alergia tardia revelada, contraprova laboratorial, nova queixa, paciente que omitiu uso de outra medicação, comorbidade descoberta tarde, resultado de cultura que vem após 72h, evento adverso raro mas descrito em bula).

DIVERSIDADE OBRIGATÓRIA DO RÉU (MULTIPROFISSIONAL):
O réu varia conforme natureza do erro:
- Erro de prescrição/diagnóstico → médico(a)
- Erro de administração, troca de paciente, falha de monitoramento, omissão de cuidado, registro inadequado → enfermeiro(a) ou técnico(a) de enfermagem
- Erro de dispensação, troca de fármaco, falha de conciliação, manipulação inadequada → farmacêutico(a)
- Erro técnico em procedimento odontológico → cirurgião(ã)-dentista
- Falha em mobilização/manobra → fisioterapeuta
- Orientação nutricional inadequada em paciente de risco → nutricionista
- Erro analítico, troca de amostra, laudo equivocado → biomédico(a)
PRIORIZE não-médicos quando os objetivos derem margem. O Código de Ética citado deve ser o da profissão do réu (CFM/COFEN/CFF/CFO/COFFITO/CFN/CFBM). O perito do Anexo 5 deve ser da MESMA profissão do réu.

PERSONAGENS = TESTEMUNHAS TÉCNICAS (NÃO É O RÉU):
- "characters" são TESTEMUNHAS TÉCNICAS chamadas por defesa ou acusação para reforçar argumentos.
- Especialidade DELIBERADAMENTE escolhida para favorecer o lado que a convoca (sem caricatura).
- Instructions devem orientar o aluno a explorar pontos do prontuário/laudos/perícia que sustentam sua tese, citando diretrizes pertinentes.

═══════════════════════════════════════════════════════════
EXIGÊNCIAS DE EXTENSÃO E PROFUNDIDADE (REGRA DE OURO)
═══════════════════════════════════════════════════════════

CADA depoimento (réu, vítima, testemunhas se houver) deve ter NO MÍNIMO 600 palavras, em primeira pessoa, com:
- Contexto pessoal e profissional
- Cronologia detalhada do dia/turno (horários precisos)
- Diálogos reproduzidos entre as partes
- Justificativas técnicas com citação de protocolos institucionais (mesmo que fictícios mas plausíveis: "Protocolo POP-ENF-024", "Diretriz SBC 2023", "Bula RDC 67/2007")
- Sentimentos, impressões, estado emocional
- Reconhecimento de limitações + autodefesa
- Easter eggs propositais: contradições sutis com outros documentos do processo

O PRONTUÁRIO deve ser EXAUSTIVO, no padrão de prontuário hospitalar real, contendo:
- Cabeçalho institucional com hospital fictício, CNES, endereço
- Identificação completa do paciente (nome, DN, idade, sexo, naturalidade, ocupação, plano, nº prontuário, data internação)
- História patológica pregressa DETALHADA (HAS, DM, cirurgias prévias com data, internações anteriores)
- Medicações em uso domiciliar com posologia
- ALERGIAS (campo crítico — pode ser easter egg)
- Hábitos de vida (etilismo, tabagismo, atividade física, padrão alimentar)
- História familiar
- HDA detalhada
- Exame físico completo POR SISTEMA (geral, cardiovascular, respiratório, abdominal, neurológico, pele/mucosas) com todos os sinais vitais e medidas
- Hipóteses diagnósticas
- Conduta inicial completa (prescrição com nome, dose, via, frequência, duração para CADA item; checagens de enfermagem)
- EVOLUÇÕES MÚLTIPLAS — mínimo 5 evoluções datadas e horadas (D1, D2, D3...), cada uma com SOAP completo, mostrando a progressão clínica e a REVIRAVOLTA
- Notas de enfermagem por turno (manhã/tarde/noite) com administrações, intercorrências, sinais vitais
- Notas de farmácia/dispensação quando pertinente
- Resultados completos de TODOS os exames solicitados, em tabelas Markdown com valores de referência

LAUDOS DE EXAMES (Anexo 3) — devem parecer EMITIDOS POR LABORATÓRIO REAL:
- Cabeçalho com nome do laboratório fictício, CNPJ, responsável técnico (nome + CRBM/CRF), endereço, telefone
- Dados do paciente, data de coleta, data de liberação, material, método
- Resultados COMPLETOS em tabelas Markdown (não resumidos)
- HEMOGRAMA: todas as séries (vermelha com VCM/HCM/CHCM/RDW; branca com diferencial absoluto e relativo; plaquetas com VPM)
- BIOQUÍMICA: todos os parâmetros pertinentes
- ANTIBIOGRAMA quando houver cultura: tabela completa com SENSÍVEL/INTERMEDIÁRIO/RESISTENTE para mínimo 12 antibióticos, com CIM (MIC) em µg/mL, padrão CLSI/BrCAST
- GASOMETRIA com pH, pCO2, pO2, HCO3, BE, SatO2, lactato
- COAGULOGRAMA com TP/INR/TTPA quando pertinente
- Interpretação técnica do laudo, neutra
- Assinatura digital fictícia + carimbo + registro profissional

ANEXO 5 — PERÍCIA TÉCNICA: documento extenso (mínimo 800 palavras), com cabeçalho oficial, qualificação completa do perito, descrição metodológica, análise dos autos, discussão equilibrada citando literatura (livros-texto, diretrizes), conclusão PONDERADA (nunca categórica), respondendo cada quesito numerado.

═══════════════════════════════════════════════════════════
IMAGENS MÉDICAS (CAMPO ESPECIAL "image_attachments")
═══════════════════════════════════════════════════════════

Identifique 1 a 3 EXAMES DE IMAGEM/GRÁFICOS pertinentes ao caso (radiografia, TC, RM, USG, ECG, lâmina histopatológica, fotografia de lesão, endoscopia). Para cada um, retorne no campo "image_attachments":
- "anchor": texto-âncora exato que aparecerá no markdown do processo, no formato [[IMAGE:slug]] (ex.: [[IMAGE:rx-torax-pa]]). VOCÊ DEVE inserir esse mesmo anchor no process_content, no local apropriado dentro do Anexo de Laudo de Imagem.
- "slug": identificador curto kebab-case
- "title": título do exame (ex.: "Radiografia de Tórax PA")
- "prompt": descrição visual EXTREMAMENTE DETALHADA para o gerador de imagens, em INGLÊS, especificando: modalidade, projeção, achados visuais EXATOS a serem mostrados (ex.: "PA chest X-ray showing right lower lobe consolidation with air bronchograms, slight blunting of the right costophrenic angle, normal cardiac silhouette, no pneumothorax"), aparência radiológica realista, marcadores anatômicos (R/L), sem texto explicativo sobreposto. Os achados visuais devem CONFIRMAR o que será descrito no laudo escrito do mesmo anexo — o aluno que souber interpretar a imagem terá vantagem.
- "caption": legenda curta para exibir abaixo da imagem

Estrutura de cada anexo de imagem no process_content:
## ANEXO X — Laudo de [Modalidade]
**Instituição:** [Hospital fictício] — Setor de Diagnóstico por Imagem
**Médico solicitante:** ... | **Médico radiologista:** Dr(a). ... — CRM ...
**Paciente:** ... | **Data:** ...
**Técnica:** ...

[[IMAGE:slug-aqui]]

*Figura X — [caption]*

**Achados:** [descrição técnica detalhada do que se vê na imagem]
**Impressão diagnóstica:** [conclusão técnica que CONFIRMA o achado visual]

═══════════════════════════════════════════════════════════
ESTRUTURA FINAL DO process_content (em Markdown rico)
═══════════════════════════════════════════════════════════

## Tribunal de Justiça [da Faculdade/Instituição fictícia]
## Vara Criminal da Comarca [...]

**Processo nº**: [número]
**Ação Penal Pública**

**Autor**: Ministério Público [...]
**Réu**: [Nome + profissão + (Aluno X)]
**Vítima**: [Nome + (Aluno Y)]

## Relato dos Fatos
[Narrativa neutra extensa, mínimo 400 palavras]

## Fundamentação Jurídica
- **Código Penal:** artigos pertinentes
- **Código de Ética [profissão do réu]:** artigos pertinentes

## Denúncia
[Texto formal do MP, mínimo 350 palavras]

## Provas
- Depoimento do Réu (Anexo 1)
- Prontuário do Paciente (Anexo 2)
- Laudo(s) de Exame (Anexo 3)
- Laudo(s) de Imagem (Anexo 4) — quando houver
- Depoimento da Vítima (Anexo 5)
- Perícia Técnica (Anexo 6)

---
## ANEXO 1 — Depoimento do Réu
[Mínimo 600 palavras, primeira pessoa, denso]

---
## ANEXO 2 — Prontuário do Paciente
[Conforme exigência exaustiva acima — mínimo 1500 palavras]

---
## ANEXO 3 — Laudo(s) de Exame Laboratorial
[Conforme exigência — tabelas completas]

---
## ANEXO 4 — Laudo(s) de Exame de Imagem
[Use [[IMAGE:slug]] anchors aqui]

---
## ANEXO 5 — Depoimento da Vítima
[Mínimo 600 palavras]

---
## ANEXO 6 — Laudo de Perícia Técnica
[Mínimo 800 palavras]

REGRAS FINAIS:
- Use Markdown rico (##, ###, **negrito**, listas, tabelas, ---).
- VARIE a profissão do réu.
- INSIRA easter eggs e plot twists.
- NÃO inclua "Argumentação para Acusação/Defesa" no corpo.
- Os anchors [[IMAGE:slug]] devem APARECER no process_content nos locais corretos.
- Toda imagem listada em image_attachments DEVE ter seu anchor presente no process_content.`;

    const userPrompt = `Objetivos de Aprendizagem: ${learningObjectives || "Não especificados"}
Número do Processo: ${caseNumber || "001/2025"}
${extractedPdfText ? `\nConteúdo de referência da aula (PDF):\n${extractedPdfText}` : ""}

Gere o processo completo, EXTENSO E PROFUNDO, em formato JSON. Lembre-se: depoimentos longos, prontuário exaustivo, exames com tabelas completas, easter eggs, plot twist na evolução, e 1-3 imagens médicas anexadas com anchors [[IMAGE:slug]].`;

    const { response } = await callAiWithFallback({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "google/gemini-2.5-pro",
      tools: [
        {
          type: "function",
          function: {
            name: "generate_mock_trial_case",
            description: "Generate a complete, deep, realistic mock trial case",
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
                image_attachments: {
                  type: "array",
                  description: "Medical images to generate and embed via [[IMAGE:slug]] anchors",
                  items: {
                    type: "object",
                    properties: {
                      slug: { type: "string" },
                      anchor: { type: "string", description: "e.g. [[IMAGE:slug]]" },
                      title: { type: "string" },
                      prompt: { type: "string", description: "Detailed English visual prompt for image generator" },
                      caption: { type: "string" },
                    },
                    required: ["slug", "anchor", "title", "prompt", "caption"],
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
    let result: any;

    if (data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const args = data.choices[0].message.tool_calls[0].function.arguments;
      result = typeof args === "string" ? JSON.parse(args) : args;
    } else if (data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    }

    if (!result) throw new Error("Could not parse AI response");

    // Generate medical images and replace anchors in process_content
    const attachments = Array.isArray(result.image_attachments) ? result.image_attachments : [];
    if (attachments.length > 0 && typeof result.process_content === "string") {
      console.log(`Generating ${attachments.length} medical image(s)...`);
      const imageResults = await Promise.all(
        attachments.map(async (att: any) => {
          const url = await generateMedicalImage(att.prompt || att.title || "");
          return { ...att, dataUrl: url };
        })
      );

      let content = result.process_content;
      for (const img of imageResults) {
        const slug = img.slug;
        const anchorPatterns = [
          `[[IMAGE:${slug}]]`,
          `[[image:${slug}]]`,
          `[[IMG:${slug}]]`,
        ];
        const replacement = img.dataUrl
          ? `\n\n![${img.title || slug}](${img.dataUrl})\n\n*${img.caption || img.title || ""}*\n\n`
          : `\n\n> _Imagem indisponível: ${img.title || slug}_\n\n`;
        for (const pat of anchorPatterns) {
          // Replace all occurrences of the literal anchor
          content = content.split(pat).join(replacement);
        }
      }
      result.process_content = content;
    }

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
