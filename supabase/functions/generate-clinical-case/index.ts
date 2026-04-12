import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANAMNESIS_PROMPT = `Você é um especialista em educação farmacêutica clínica. Gere um roteiro completo de paciente simulado para prática de anamnese farmacêutica.

REGRAS OBRIGATÓRIAS:
1. NÃO use Markdown (nenhum #, ##, **, *, ---, \`\`\`, |---|, etc.)
2. NÃO comece com frases introdutórias como "Excelente", "Vamos construir", "Aqui está", "Claro", "Certo" ou similares.
3. Comece DIRETO com o título do caso.

FORMATO OBRIGATÓRIO (siga EXATAMENTE esta estrutura):

Linha 1: Um título criativo e descritivo para o caso (ex: "Paciente Idoso com Polifarmácia e Declínio da Função Renal")

Depois pule uma linha e siga com:

IDENTIFICAÇÃO DO PACIENTE:

Nome fictício: [nome completo]
Idade: [idade] anos
Sexo: [sexo]
Profissão: [profissão]
Estado civil: [estado civil]

QUEIXA PRINCIPAL:

[Texto corrido descrevendo a queixa principal do paciente, 2-3 frases]

HISTÓRIA DA DOENÇA ATUAL (HDA):

[Texto corrido com 1-2 parágrafos descrevendo a evolução da doença atual]

MEDICAMENTOS EM USO:

Medicamento          Dose          Posologia          Tempo de Uso

[medicamento1]       [dose]        [posologia]        [tempo]
[medicamento2]       [dose]        [posologia]        [tempo]
[Continue com 4-7 medicamentos, alinhados por espaços]

HISTÓRIA PREGRESSA:

- [diagnóstico 1 com tempo]
- [diagnóstico 2 com tempo]
- [cirurgias se houver]
- Alergia: [informação sobre alergias]

HISTÓRIA SOCIAL:

- Tabagismo: [detalhes]
- Etilismo: [detalhes]
- Atividade física: [detalhes]
- Alimentação: [detalhes incluindo ingestão hídrica]

ORIENTAÇÕES AO ATOR/PACIENTE SIMULADO:

- Como o paciente deve se comportar:
  - [comportamento 1]
  - [comportamento 2]
  - [comportamento 3]
  - [comportamento 4]

- Informações que só deve revelar se perguntado:
  - [informação oculta 1 - algo clinicamente relevante como automedicação, não adesão, etc.]
  - [informação oculta 2]
  - [informação oculta 3]
  - [informação oculta 4]

- Nível de conhecimento sobre seus medicamentos:
  - [o que sabe sobre cada medicamento]
  - [o que NÃO sabe e é relevante clinicamente]

IMPORTANTE:
- Use espaços para alinhar as colunas das tabelas de medicamentos (NÃO use | ou Markdown)
- Cada medicamento deve estar em sua própria linha
- Inclua detalhes realistas e clinicamente relevantes
- As informações ocultas devem conter problemas farmacoterapêuticos que o aluno precisa descobrir

Gere um caso realista e clinicamente relevante.`;

const RECONCILIATION_PROMPT = `Você é um especialista em educação farmacêutica clínica. Gere um caso clínico completo para prática de reconciliação medicamentosa.

REGRAS OBRIGATÓRIAS:
1. NÃO use Markdown (nenhum #, ##, **, *, ---, \`\`\`, |---|, etc.)
2. NÃO comece com frases introdutórias como "Excelente", "Vamos construir", "Aqui está", "Claro", "Certo" ou similares.
3. Comece DIRETO com o título do caso.

FORMATO OBRIGATÓRIO (siga EXATAMENTE esta estrutura):

Linha 1: Um título criativo e descritivo para o caso (ex: "Cetoacidose Diabética em Paciente com Múltiplas Comorbidades")

Linha 2-3: Um RESUMO de 2-3 frases dando uma visão geral do caso para o aluno entender o contexto antes de começar.

Depois pule uma linha e siga com:

DADOS DO PACIENTE:

Nome: [nome completo]
Idade: [idade] anos
Sexo: [sexo]
Peso: [peso] kg
Altura: [altura] m
Motivo da Internação: [motivo detalhado]

DIAGNÓSTICOS:

- [diagnóstico 1 com tempo se aplicável]
- [diagnóstico 2]
- [diagnóstico 3]
- [diagnóstico de internação]

MEDICAMENTOS PRÉ-INTERNAÇÃO / USO DOMICILIAR:

Medicamento           Dose          Posologia       Via

[medicamento1]        [dose]        [posologia]     [via]
[medicamento2]        [dose]        [posologia]     [via]
[Continue com 5-8 medicamentos, alinhados por espaços]

MEDICAMENTOS PRESCRITOS NA INTERNAÇÃO / ATUAL:

Medicamento                      Dose                Posologia                       Via

[medicamento1]                   [dose]              [posologia]                     [via]
[medicamento2]                   [dose]              [posologia]                     [via]
[Continue, incluindo discrepâncias intencionais e não-intencionais]

EXAMES LABORATORIAIS RELEVANTES:

Exame                     Resultado          Valor de Referência

[exame1]                  [resultado]        [referência]
[exame2]                  [resultado]        [referência]
[Continue com 6-10 exames relevantes]

SINAIS VITAIS:

PA: [valor] mmHg
FC: [valor] bpm
FR: [valor] ipm
Temperatura: [valor] °C
SpO2: [valor]% em ar ambiente

DISCREPÂNCIAS PARA IDENTIFICAÇÃO (USO EXCLUSIVO DO PROFESSOR):

- Omissão: [medicamento] ([intencional/NÃO intencional], [justificativa clínica])
- Omissão: [medicamento] ([intencional/NÃO intencional], [justificativa])
- Comissão: [medicamento] ([nova droga], [intencional/NÃO intencional], [justificativa])
[Continue com todas as discrepâncias, incluindo pelo menos 1 não intencional]

IMPORTANTE:
- Use espaços para alinhar as colunas das tabelas (NÃO use | ou Markdown)
- Inclua pelo menos uma discrepância NÃO intencional para o aluno identificar
- Os exames devem ser coerentes com o quadro clínico
- As discrepâncias devem ser clinicamente significativas e educativas

Gere um caso realista e clinicamente relevante.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    const { phase, theme } = await req.json();

    if (!phase || !["anamnesis", "reconciliation"].includes(phase)) {
      return new Response(JSON.stringify({ error: "Phase must be 'anamnesis' or 'reconciliation'" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!theme || typeof theme !== "string" || theme.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Theme is required (min 3 chars)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = phase === "anamnesis" ? ANAMNESIS_PROMPT : RECONCILIATION_PROMPT;
    const userMessage = phase === "anamnesis"
      ? `Gere um roteiro de paciente simulado para anamnese farmacêutica sobre o tema: ${theme.trim()}. Siga EXATAMENTE o formato especificado com todas as seções (IDENTIFICAÇÃO, QUEIXA PRINCIPAL, HDA, MEDICAMENTOS EM USO, HISTÓRIA PREGRESSA, HISTÓRIA SOCIAL, ORIENTAÇÕES AO ATOR). Comece com um título criativo, não use Markdown.`
      : `Gere um caso clínico para reconciliação medicamentosa sobre o tema: ${theme.trim()}. Siga EXATAMENTE o formato especificado com todas as seções (DADOS DO PACIENTE, DIAGNÓSTICOS, MEDICAMENTOS PRÉ-INTERNAÇÃO, MEDICAMENTOS NA INTERNAÇÃO, EXAMES, SINAIS VITAIS, DISCREPÂNCIAS). Comece com um título criativo seguido de um resumo, não use Markdown.`;

    const { response } = await callAiWithFallback(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      },
      { userId, promptType: `generate-clinical-case-${phase}` },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao gerar caso clínico" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Clean up any remaining markdown but KEEP section headers
    content = content
      .replace(/^#+\s*/gm, "")        // remove # headers
      .replace(/\*\*/g, "")            // remove bold **
      .replace(/\*/g, "")              // remove italic *
      .replace(/^---+$/gm, "")        // remove horizontal rules
      .replace(/```[\s\S]*?```/g, "")  // remove code blocks
      .replace(/\|[^\n]+\|/g, "")     // remove markdown table rows
      .replace(/^[\s|:-]+$/gm, "")    // remove table separators
      .replace(/^\s*\n{3,}/gm, "\n\n") // collapse excessive blank lines
      .trim();

    // Remove intro sentences at the start
    const introPatterns = [
      /^(Excelente|Vamos|Aqui está|Claro|Certo|Perfeito|Ótimo|Com certeza|Sem problemas|Caso\s*\d*\s*[-–]?\s*)[^\n]*\n+/i,
      /^[^\n]{0,200}(vamos construir|vamos criar|segue|apresento)[^\n]*\n+/i,
    ];
    for (const pattern of introPatterns) {
      content = content.replace(pattern, "");
    }
    content = content.replace(/^\s*\n{3,}/gm, "\n\n").trim();

    // Extract title: first line (should be "Name (initials), age")
    const lines = content.split("\n").filter((l: string) => l.trim());
    let title = `Caso - ${theme.trim().substring(0, 50)}`;
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/^[#*\s]+/, "").replace(/:$/, "").trim();
      if (firstLine.length > 3 && firstLine.length < 120) {
        title = firstLine;
        // Remove title from content since it will be stored separately
        content = content.replace(lines[0], "").trim();
      }
    }

    return new Response(JSON.stringify({ title, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
