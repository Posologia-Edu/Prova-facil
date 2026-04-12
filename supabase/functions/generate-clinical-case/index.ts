import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANAMNESIS_PROMPT = `Você é um especialista em educação farmacêutica clínica. Gere um roteiro de paciente simulado para prática de anamnese farmacêutica.

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO:
- NÃO use Markdown (nenhum #, ##, **, *, ---, \`\`\`, etc.)
- NÃO comece com frases introdutórias como "Excelente", "Vamos construir", "Aqui está", "Claro" ou similares.
- Comece DIRETO com o conteúdo do caso clínico.
- Use APENAS texto plano com seções separadas por linhas em branco.
- Para títulos de seção, escreva em MAIÚSCULAS seguido de dois pontos. Exemplo: "IDENTIFICAÇÃO DO PACIENTE:"
- Para tabelas de medicamentos, use formato tabular com espaçamento fixo usando TAB, assim:
  Medicamento          Dose          Posologia          Tempo de Uso
  Metformina           850 mg        2x/dia             3 anos
  Losartana            50 mg         1x/dia             5 anos
- Listas devem usar "- " (hífen e espaço) como marcador, sem negrito.

O roteiro deve conter as seguintes seções:

IDENTIFICAÇÃO DO PACIENTE:
Nome fictício, idade, sexo, profissão, estado civil

QUEIXA PRINCIPAL:
Motivo da consulta farmacêutica (1-2 frases)

HISTÓRIA DA DOENÇA ATUAL (HDA):
Descrição cronológica dos sintomas, duração, fatores de melhora/piora

MEDICAMENTOS EM USO:
Tabela com medicamento, dose, posologia e tempo de uso (mínimo 3-5 medicamentos)

HISTÓRIA PREGRESSA:
Doenças anteriores, cirurgias, alergias

HISTÓRIA SOCIAL:
Tabagismo, etilismo, atividade física, alimentação

ORIENTAÇÕES AO ATOR/PACIENTE SIMULADO:
- Como o paciente deve se comportar
- Informações que só deve revelar se perguntado
- Nível de conhecimento sobre seus medicamentos

Gere um caso realista e clinicamente relevante. Use linguagem clara e objetiva.`;

const RECONCILIATION_PROMPT = `Você é um especialista em educação farmacêutica clínica. Gere um caso clínico completo para prática de reconciliação medicamentosa.

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO:
- NÃO use Markdown (nenhum #, ##, **, *, ---, \`\`\`, etc.)
- NÃO comece com frases introdutórias como "Excelente", "Vamos construir", "Aqui está", "Claro" ou similares.
- Comece DIRETO com o conteúdo do caso clínico.
- Use APENAS texto plano com seções separadas por linhas em branco.
- Para títulos de seção, escreva em MAIÚSCULAS seguido de dois pontos. Exemplo: "DADOS DO PACIENTE:"
- Para tabelas, use formato tabular com espaçamento fixo usando TAB, assim:
  Medicamento          Dose          Posologia          Via
  Metformina           850 mg        2x/dia             VO
  Losartana            50 mg         1x/dia             VO
- Para exames laboratoriais, use formato tabular:
  Exame                     Resultado          Valor de Referência
  Glicemia de Jejum         285 mg/dL          70 - 99 mg/dL
  Creatinina                2,8 mg/dL          0,6 - 1,3 mg/dL
- Listas devem usar "- " (hífen e espaço) como marcador, sem negrito.

O caso deve conter:

DADOS DO PACIENTE:
Nome fictício, idade, sexo, peso, altura, motivo da internação/consulta

DIAGNÓSTICOS:
Lista de diagnósticos ativos (pelo menos 2-3)

MEDICAMENTOS PRÉ-INTERNAÇÃO / USO DOMICILIAR:
Tabela com nome, dose, posologia, via de administração (pelo menos 5-8 medicamentos)

MEDICAMENTOS PRESCRITOS NA INTERNAÇÃO / ATUAL:
Tabela com nome, dose, posologia, via (incluir discrepâncias intencionais: omissões, duplicidades, doses diferentes)

EXAMES LABORATORIAIS RELEVANTES:
Tabela com exame, resultado e valor de referência

SINAIS VITAIS:
PA, FC, FR, Temperatura, SpO2

DISCREPÂNCIAS PARA IDENTIFICAÇÃO (USO EXCLUSIVO DO PROFESSOR):
Lista das discrepâncias que o aluno deve encontrar, com classificação de cada uma (omissão, comissão, dose, frequência, via)

Gere um caso realista com discrepâncias clinicamente significativas para identificação pelos alunos.`;

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

    const { response } = await callAiWithFallback(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Gere um caso clínico sobre o seguinte tema: ${theme.trim()}. Lembre-se: comece direto com o conteúdo, sem introduções, sem Markdown, texto plano profissional com tabelas formatadas por tabulação.` },
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

    // Clean up any remaining markdown
    content = content
      .replace(/^#+\s*/gm, "")        // remove # headers
      .replace(/\*\*/g, "")            // remove bold **
      .replace(/\*/g, "")              // remove italic *
      .replace(/^---+$/gm, "")        // remove horizontal rules
      .replace(/```[\s\S]*?```/g, "")  // remove code blocks
      .replace(/^\s*\n{3,}/gm, "\n\n") // collapse excessive blank lines
      .trim();

    // Remove intro sentences at the start
    const introPatterns = [
      /^(Excelente|Vamos|Aqui está|Claro|Certo|Perfeito|Ótimo|Com certeza|Sem problemas)[^\n]*\n+/i,
      /^[^\n]{0,200}(vamos construir|vamos criar|segue|apresento)[^\n]*\n+/i,
    ];
    for (const pattern of introPatterns) {
      content = content.replace(pattern, "");
    }
    content = content.trim();

    // Extract title from first meaningful line
    const lines = content.split("\n").filter((l: string) => l.trim());
    let title = `Caso - ${theme.trim().substring(0, 50)}`;
    for (const line of lines) {
      const clean = line.replace(/^[#*\s]+/, "").replace(/:/g, "").trim();
      if (clean.length > 5 && clean.length < 100 && !clean.startsWith("-")) {
        title = clean;
        break;
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
