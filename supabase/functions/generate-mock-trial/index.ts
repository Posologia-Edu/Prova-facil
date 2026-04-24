import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Generate a medical image (X-ray, CT, ECG, etc.) via Lovable AI image model.
// Returns a data:image/png;base64,... URL or null on failure.
// Has an individual timeout so a slow image never blocks the whole response.
async function generateMedicalImage(prompt: string, timeoutMs = 45000): Promise<string | null> {
  if (!LOVABLE_API_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
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
    const msg = data.choices?.[0]?.message;
    // Try multiple known shapes for image responses
    let url: string | null =
      msg?.images?.[0]?.image_url?.url ||
      msg?.images?.[0]?.url ||
      msg?.image_url?.url ||
      null;

    // Some providers embed the image as a markdown ![](data:...) inside content
    if (!url && typeof msg?.content === "string") {
      const m = msg.content.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/);
      if (m) url = m[0];
    }
    // Some providers return an array content with image_url parts
    if (!url && Array.isArray(msg?.content)) {
      for (const part of msg.content) {
        if (part?.type === "image_url" && part?.image_url?.url) {
          url = part.image_url.url;
          break;
        }
      }
    }
    if (!url) {
      console.error("Image gen no URL in response:", JSON.stringify(data).slice(0, 500));
    }
    return url || null;
  } catch (e) {
    console.error("generateMedicalImage error:", (e as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
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

⚠️ REGRA ABSOLUTA Nº 1 — NUNCA USE PLACEHOLDERS LITERAIS:
Você está PROIBIDO de retornar texto como:
- "[Mínimo 600 palavras, primeira pessoa, denso]"
- "[Conforme exigência exaustiva acima — mínimo 1500 palavras]"
- "[Tabelas completas]"
- "[Use [[IMAGE:slug]] anchors aqui]"
- "[Mínimo 800 palavras]"
- "[Narrativa neutra extensa, mínimo 400 palavras]"
- Qualquer texto entre colchetes que descreva o que DEVERIA estar lá em vez de já ESTAR lá.
- Qualquer frase do tipo "conforme exigido", "ver acima", "preencher conforme template".

Toda seção precisa estar TOTALMENTE ESCRITA e PRONTA PARA LEITURA pelo aluno. As exigências de tamanho abaixo são METAS QUE VOCÊ DEVE CUMPRIR ESCREVENDO O CONTEÚDO COMPLETO — não rótulos a copiar para o documento final.

Se você tiver dúvida se algo é uma instrução ou um conteúdo: tudo neste system prompt é INSTRUÇÃO. Nada deste system prompt deve aparecer literalmente no process_content. O process_content deve parecer um documento jurídico-clínico real, denso, lido pela primeira vez por um juiz.


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

CADA depoimento (réu, vítima, testemunhas se houver) deve ter NO MÍNIMO 700 palavras REAIS ESCRITAS (não rótulo "[700 palavras]"), em primeira pessoa, e seguir OBRIGATORIAMENTE esta estrutura interna em vários parágrafos longos:
1. Apresentação pessoal e profissional (formação, tempo de atuação, vínculo institucional, registro profissional fictício).
2. Como tomou conhecimento do caso e qual era seu papel naquele turno/contexto.
3. CRONOLOGIA HORA A HORA do dia dos fatos, com horários específicos (06h45, 07h10, 07h32, 09h15...) — pelo menos 8 marcos temporais.
4. DIÁLOGOS reproduzidos entre as partes ("Ela me disse: '...'. Eu respondi: '...'") — pelo menos 4 diálogos transcritos.
5. Justificativas técnicas detalhadas com citação de protocolos institucionais fictícios mas plausíveis ("Protocolo POP-ENF-024", "Diretriz SBC 2023", "RDC nº 67/2007 da ANVISA", "Manual de Antimicrobianos do Hospital, edição 2022").
6. Estado emocional, dúvidas, hesitações vividas no momento.
7. Reconhecimento de limitações + autodefesa argumentada.
8. EASTER EGGS propositais: contradições sutis com outros documentos do processo (ex.: cita um horário que diverge da nota de enfermagem; menciona uma alergia que não consta no prontuário; afirma ter conferido um exame que ainda não tinha sido liberado).

PROIBIÇÕES ABSOLUTAS para depoimentos:
- NUNCA escreva um depoimento curto, com 1-3 parágrafos genéricos. Isso INVALIDA TODA A ATIVIDADE.
- NUNCA resuma. Se o depoimento couber em 200 palavras, você falhou.
- Cada depoimento deve ter PELO MENOS 6 parágrafos longos e densos.
- Use linguagem profissional típica da categoria do depoente, com termos técnicos da profissão.

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

Identifique 1 a 2 EXAMES DE IMAGEM/GRÁFICOS pertinentes ao caso (radiografia, TC, RM, USG, ECG, lâmina histopatológica, fotografia de lesão, endoscopia). Para cada um, retorne no campo "image_attachments":
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

SEQUÊNCIA OBRIGATÓRIA DE SEÇÕES (todas COMPLETAMENTE PREENCHIDAS, sem colchetes-instrução):
1. Cabeçalho do tribunal fictício (nome do tribunal, vara, comarca)
2. Identificação do processo (número, tipo de ação, autor=MP, réu nominado com profissão, vítima nominada)
3. "Relato dos Fatos" — narrativa neutra REAL com 400+ palavras escritas
4. "Fundamentação Jurídica" — artigos REAIS citados e descritos (Código Penal + Código de Ética da profissão do réu)
5. "Denúncia" — peça do MP REAL com 350+ palavras escritas
6. Lista de Provas (apenas a lista nesta seção)
7. ANEXO 1 — Depoimento do Réu: TEXTO COMPLETO em 1ª pessoa, 600+ palavras escritas
8. ANEXO 2 — Prontuário do Paciente: documento hospitalar COMPLETO de 1500+ palavras (cabeçalho institucional, identificação, HPP, alergias, medicações, exame físico por sistema, hipóteses, condutas, mínimo 5 evoluções datadas, notas de enfermagem por turno, resultados completos)
9. ANEXO 3 — Laudo(s) de Exame Laboratorial: laudo(s) REAL(IS) com cabeçalho de laboratório fictício, dados do paciente, tabelas Markdown COMPLETAS de hemograma/bioquímica/antibiograma/gasometria/coagulograma conforme pertinente
10. ANEXO 4 — Laudo(s) de Exame de Imagem: laudo escrito + anchor [[IMAGE:slug]] inserido no local exato (este é o ÚNICO uso permitido de colchetes — o anchor literal)
11. ANEXO 5 — Depoimento da Vítima: TEXTO COMPLETO em 1ª pessoa, 600+ palavras escritas
12. ANEXO 6 — Laudo de Perícia Técnica: documento pericial COMPLETO de 800+ palavras

REGRAS FINAIS:
- Use Markdown rico (##, ###, **negrito**, listas, tabelas, ---).
- VARIE a profissão do réu conforme o tipo de erro.
- INSIRA 8-12 easter eggs e um plot twist real na evolução.
- NÃO inclua "Argumentação para Acusação/Defesa" no corpo.
- Os anchors [[IMAGE:slug]] são o único colchete permitido no process_content e DEVEM aparecer no Anexo 4 nos locais corretos.
- Toda imagem listada em image_attachments DEVE ter seu anchor presente no process_content.
- AUTOVERIFICAÇÃO antes de retornar: revise o process_content e confirme que NÃO há nenhum texto entre colchetes que descreva o que deveria estar ali (ex: "[Mínimo X palavras]", "[Conforme...]", "[...]"). Se encontrar, REESCREVA aquela seção com o conteúdo real.`;

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

    // Image generation is now decoupled: we return image_attachments metadata
    // and the client persists rows in mock_trial_case_images, then triggers
    // generate-mock-trial-image per row asynchronously. This avoids timeouts
    // and lets the teacher regenerate individual images.
    const attachments = (Array.isArray(result.image_attachments) ? result.image_attachments : [])
      .slice(0, 3)
      .map((a: any) => ({
        slug: String(a.slug || "").trim() || `img-${Math.random().toString(36).slice(2, 8)}`,
        anchor: String(a.anchor || `[[IMAGE:${a.slug}]]`),
        title: String(a.title || ""),
        caption: String(a.caption || ""),
        prompt: String(a.prompt || a.title || ""),
      }));
    result.image_attachments = attachments;

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
