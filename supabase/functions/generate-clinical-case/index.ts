import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANAMNESIS_PROMPT = `Você é um especialista em educação farmacêutica clínica. Gere um roteiro de paciente simulado para prática de anamnese farmacêutica.

REGRAS OBRIGATÓRIAS:
1. NÃO use Markdown (nenhum #, ##, **, *, ---, \`\`\`, |---|, etc.)
2. NÃO comece com frases introdutórias como "Excelente", "Vamos construir", "Aqui está", "Claro", "Certo" ou similares.
3. NÃO use tabelas. Apresente medicamentos em formato de texto corrido ou lista simples.
4. Comece DIRETO com o conteúdo.

FORMATO OBRIGATÓRIO:
- O caso deve ter um TÍTULO curto no formato: "Nome do Paciente (iniciais), idade"
  Exemplo: "Geraldo Martins (G.M.), 70 anos"
- Após o título, escreva um TEXTO CORRIDO (narrativa) descrevendo a história clínica do paciente em 3-5 parágrafos.
- Inclua no texto corrido: dados do paciente, queixas, histórico de doenças, medicamentos em uso (com doses e posologias mencionados naturalmente no texto), hábitos de vida, comportamento do paciente, e detalhes que o aluno precisaria descobrir durante a anamnese.
- Os medicamentos devem aparecer naturalmente no texto, exemplo: "Está em uso de metformina 850 mg 2x/dia, glibenclamida 5 mg 1x/dia, losartana 50 mg 2x/dia e omeprazol 20 mg/dia."
- Adicione detalhes comportamentais e psicossociais que enriqueçam a simulação.
- NÃO separe em seções com títulos. Escreva como uma narrativa contínua e fluida.

Gere um caso realista e clinicamente relevante.`;

const RECONCILIATION_PROMPT = `Você é um especialista em educação farmacêutica clínica. Gere um caso clínico completo para prática de reconciliação medicamentosa.

REGRAS OBRIGATÓRIAS:
1. NÃO use Markdown (nenhum #, ##, **, *, ---, \`\`\`, |---|, etc.)
2. NÃO comece com frases introdutórias como "Excelente", "Vamos construir", "Aqui está", "Claro", "Certo" ou similares.
3. NÃO use tabelas formatadas com | ou tabulação. Apresente tudo em texto corrido ou listas simples com hífen.
4. Comece DIRETO com o conteúdo.

FORMATO OBRIGATÓRIO:
- O caso deve ter um TÍTULO curto no formato: "Nome do Paciente (iniciais), idade"
  Exemplo: "Larissa Monteiro (L.M.), 31 anos"
- Após o título, escreva o caso como TEXTO CORRIDO (narrativa) em parágrafos.
- Parágrafo 1: Dados do paciente (nome, idade, sexo, profissão), motivo da internação/consulta e diagnósticos.
- Parágrafo 2: Medicamentos em uso domiciliar, mencionados naturalmente no texto com doses e posologias. Exemplo: "Faz uso domiciliar de metformina 850 mg 2x/dia via oral, losartana 50 mg 1x/dia, anlodipino 5 mg 1x/dia e sinvastatina 20 mg à noite."
- Parágrafo 3: Medicamentos prescritos na internação (se aplicável), incluindo discrepâncias intencionais em relação ao uso domiciliar (omissões, duplicidades, doses diferentes).
- Parágrafo 4: Exames laboratoriais relevantes e sinais vitais, mencionados naturalmente.
- Parágrafo 5 (opcional, para uso exclusivo do professor): Breve menção das discrepâncias que o aluno deve identificar.
- NÃO separe em seções com títulos em maiúsculas. Escreva como narrativa contínua.
- Inclua discrepâncias clinicamente significativas para identificação pelos alunos.

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
