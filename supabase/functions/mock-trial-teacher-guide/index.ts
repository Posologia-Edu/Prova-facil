// Generates a "Roteiro de Condução do Professor" (teacher facilitation guide)
// for a mock trial case. Visible only to the trial owner (professor).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = user.id;

    const { caseId } = await req.json();
    if (!caseId) {
      return new Response(JSON.stringify({ error: "caseId obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: caseRow } = await admin
      .from("mock_trial_cases")
      .select("id, title, case_number, learning_objectives, characters_json, sections_json, process_content, mock_trial_id, mock_trials(user_id)")
      .eq("id", caseId)
      .single();

    if (!caseRow || (caseRow as any).mock_trials?.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build process content from sections (preferred) or fallback to process_content
    const sections: any[] = Array.isArray(caseRow.sections_json) ? (caseRow.sections_json as any[]) : [];
    let processText = sections
      .filter((s) => s?.status === "ready" && s?.content)
      .map((s) => `## ${s.title}\n\n${s.content}`)
      .join("\n\n---\n\n");
    if (!processText && caseRow.process_content) processText = caseRow.process_content as string;

    if (!processText || processText.trim().length < 200) {
      return new Response(JSON.stringify({ error: "Processo ainda não tem conteúdo suficiente para gerar o roteiro." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const characters = (caseRow.characters_json as any[]) || [];
    const reu = characters.find((c) => /réu|reu|defendant/i.test(String(c.role || "")));
    const reuProfissao = reu?.profession || "profissional da saúde";

    const prompt = `Você é um professor sênior de educação em saúde, com larga experiência em conduzir discussões de Júri Simulado. Vai elaborar um **ROTEIRO DE CONDUÇÃO DO PROFESSOR** — um material de uso EXCLUSIVO do docente, que servirá como guia para a discussão pós-atividade com os alunos.

# OBJETIVOS DE APRENDIZAGEM DO CASO
${caseRow.learning_objectives || "(não informados)"}

# PROFISSÃO DO RÉU
${reuProfissao}

# PROCESSO COMPLETO (todas as peças já geradas)
${processText.slice(0, 25000)}

---

# O QUE VOCÊ DEVE PRODUZIR

Um roteiro estruturado em Markdown, em português brasileiro, com TODAS as seções abaixo. Use linguagem técnica de docente, direta, com tom de "guia para o professor". Mínimo de **1200 palavras**.

## 1. 🎯 Síntese do caso (para o professor)
Resumo de 1 parágrafo do que aconteceu clinicamente, com o desfecho e o ponto central de discussão.

## 2. 📌 Pontos críticos a observar (CHECKLIST)
Lista numerada dos pontos-chave que o professor DEVE garantir que sejam abordados na discussão. Inclua obrigatoriamente:
- **Conduta farmacológica**: escolha do fármaco, dose, via, posologia, duração, interações, ajustes (renal/hepático/etário), monitorização, alternativas mais adequadas para o caso.
- **Cuidado com o paciente**: avaliação inicial, reavaliações, comunicação com paciente/família, registros em prontuário, segurança, prevenção de eventos adversos.
- **Diagnóstico diferencial e raciocínio clínico**: hipóteses que poderiam ter sido consideradas.
- **Aspectos éticos e legais**: dispositivos legais e do código de ética da profissão do réu (${reuProfissao}) que se aplicam ao caso.
- **Trabalho em equipe e comunicação interprofissional**.

## 3. ❓ Perguntas-guia para a discussão
Liste **8 a 12 perguntas socráticas** que o professor pode lançar aos alunos para estimular o raciocínio (não perguntas fechadas; perguntas que abram debate). Organize em subgrupos: Acusação | Defesa | Pontos neutros / aprofundamento.

## 4. 🧪 Análise técnica esperada
Para cada **achado clínico, exame ou conduta relevante** do caso, traga um quadro com:
- O que foi feito
- O que era o padrão-ouro / conduta ideal
- Justificativa científica (cite diretrizes brasileiras quando possível: Ministério da Saúde, SBI, SBN, SBC, SBP, ANVISA, Cofen, CFF, CFM, CFO etc.)

Use **tabela Markdown**.

## 5. ⚖️ Argumentos esperados
- **Pró-acusação (3-5 pontos fortes)**: o que a acusação tem de melhor.
- **Pró-defesa (3-5 pontos fortes)**: o que a defesa tem de melhor.
- **"Easter eggs" / armadilhas do caso**: detalhes sutis embutidos no processo que os alunos podem não notar — explique cada um ao professor.

## 6. 🧭 Veredito tecnicamente mais defensável
Sua opinião fundamentada (sem ser dogmática) sobre qual seria o desfecho mais justo do ponto de vista técnico-científico, com a justificativa. Lembre: o objetivo é educacional, não punitivo.

## 7. 📚 Referências sugeridas
Liste 4-8 referências REAIS e atuais (diretrizes brasileiras, livros-texto consagrados, artigos seminais) que o professor pode indicar aos alunos para aprofundamento. Formato: Autor/Órgão (ano). Título. Veículo.

## 8. ⏱️ Sugestão de cronograma da discussão (90 min)
Pequena tabela com blocos de tempo sugeridos (Abertura, Sustentação acusação, Sustentação defesa, Réplica, Tréplica, Veredito do júri, Debriefing técnico do professor).

# REGRAS
- NÃO repita o conteúdo do processo ipsis litteris — esse roteiro é COMPLEMENTAR.
- Seja objetivo, com bullets curtos. Evite parágrafos longos exceto onde necessário.
- Esse documento é confidencial do professor — pode ter "spoilers" e a resposta esperada.
- Retorne APENAS o Markdown do roteiro, sem meta-comentários.`;

    const { response } = await callAiWithFallback(
      {
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "Você é um professor experiente em educação em saúde, especialista em condução de Júri Simulado. Produza um roteiro docente extenso, técnico e prático em Markdown." },
          { role: "user", content: prompt },
        ],
      },
      { userId, promptType: "mock_trial_teacher_guide" },
    );

    if (!response.ok) {
      const txt = await response.text().catch(() => "");
      console.error("AI error:", response.status, txt);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações > Workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI ${response.status}`);
    }

    const data = await response.json();
    const content = (data?.choices?.[0]?.message?.content || "").trim();
    if (!content) throw new Error("Conteúdo vazio retornado pela IA");

    await admin.from("mock_trial_cases").update({ teacher_guide: content }).eq("id", caseId);

    return new Response(JSON.stringify({ ok: true, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("teacher-guide error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
