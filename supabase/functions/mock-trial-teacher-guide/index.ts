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

Um roteiro **DETALHADO, EXPLICATIVO e DIDÁTICO** em Markdown (português brasileiro). NÃO produza apenas listas de tópicos soltos — cada item deve vir COM EXPLICAÇÃO. Mínimo de **2000 palavras**. Use **GitHub Flavored Markdown** (tabelas com pipes, negrito, listas, blockquotes).

---

## 1. 🎯 Síntese do caso (para o professor)
Parágrafo único (8-12 linhas) descrevendo: o que o paciente apresentou, qual foi a conduta do réu, qual o desfecho, e qual é **o ponto central de discussão pedagógica** do caso.

---

## 2. 📌 Pontos críticos a observar

Para CADA item abaixo, escreva **1 parágrafo explicativo (mínimo 4-6 linhas)** dizendo CONCRETAMENTE o que observar NESTE caso específico — não use frases genéricas. Use o formato:

### 2.1 Conduta farmacológica
[Parágrafo explicando, com base no caso, o que avaliar sobre escolha do fármaco, dose, via, posologia, duração, interações, ajustes (renal/hepático/etário), monitorização e quais alternativas seriam mais adequadas. Cite os fármacos pelo nome usado no processo.]

### 2.2 Cuidado com o paciente
[Parágrafo sobre avaliação inicial, reavaliações, sinais de alerta perdidos, comunicação com paciente/família, registros em prontuário, segurança e prevenção de eventos adversos NESTE caso.]

### 2.3 Diagnóstico diferencial e raciocínio clínico
[Parágrafo com hipóteses diagnósticas que poderiam/deveriam ter sido consideradas, e por quê.]

### 2.4 Aspectos éticos e legais
[Parágrafo citando ARTIGOS específicos do Código de Ética da profissão de ${reuProfissao} (ex: "Art. X do Código de Ética Médica veda..."), Lei nº 8.080/90, Resoluções do Conselho profissional, Código de Defesa do Consumidor quando aplicável, etc.]

### 2.5 Trabalho em equipe e comunicação interprofissional
[Parágrafo sobre falhas/acertos de comunicação entre profissionais NO caso e como poderiam ter mudado o desfecho.]

---

## 3. ❓ Perguntas-guia para a discussão (com resposta-modelo)

Liste **10 perguntas socráticas**, divididas em 3 subseções (### Acusação, ### Defesa, ### Aprofundamento técnico). Para CADA pergunta, use OBRIGATORIAMENTE este formato:

> **❓ Pergunta:** [pergunta socrática que estimula debate]
>
> **💡 Resposta-modelo (para o professor):** [Resposta completa de 4-7 linhas explicando o que o professor espera ouvir, conceitos-chave que devem aparecer, evidências/diretrizes que sustentam, e como redirecionar se os alunos não chegarem lá.]

---

## 4. 🧪 Análise técnica esperada (tabela)

Tabela Markdown bem formatada. **CRÍTICO**: cada linha em uma linha separada, com pipes alinhados. Inclua 5-8 achados/condutas relevantes do caso.

| Achado / Conduta no caso | O que foi feito | Padrão-ouro / conduta ideal | Justificativa científica + diretriz |
|---|---|---|---|
| [Achado 1] | [conduta adotada] | [conduta ideal] | [justificativa com diretriz brasileira: MS, SBI, SBN, SBC, SBP, ANVISA, Cofen, CFF, CFM, CFO etc.] |
| [Achado 2] | ... | ... | ... |

---

## 5. ⚖️ Argumentos esperados

### 5.1 Pró-acusação (4-5 pontos)
Para cada ponto: **título em negrito** + 2-3 linhas explicando o argumento E a evidência que o sustenta.

### 5.2 Pró-defesa (4-5 pontos)
Mesma estrutura.

### 5.3 🪤 Armadilhas / "easter eggs" do caso
Para cada armadilha: **título em negrito** + explicação de 2-3 linhas sobre o detalhe sutil embutido no processo e por que os alunos podem não notar.

---

## 6. 🧭 Veredito tecnicamente mais defensável
Parágrafo de 8-12 linhas com sua opinião fundamentada (não dogmática) sobre o desfecho mais justo do ponto de vista técnico-científico, com justificativa baseada em evidência. Lembre: objetivo é educacional.

---

## 7. 📚 Referências sugeridas
Lista numerada de 5-8 referências REAIS e atuais (diretrizes brasileiras, livros-texto consagrados, artigos seminais). Formato: **Autor/Órgão (ano).** *Título.* Veículo/edição.

---

## 8. ⏱️ Sugestão de cronograma da discussão (90 min)

Tabela Markdown:

| Bloco | Atividade | Duração | Foco do professor |
|---|---|---|---|
| 1 | Abertura e contextualização | 10 min | [o que o prof deve fazer/dizer] |
| 2 | Sustentação da acusação | 15 min | [o que observar] |
| 3 | Sustentação da defesa | 15 min | [o que observar] |
| 4 | Réplica e tréplica | 10 min | [como mediar] |
| 5 | Deliberação do júri | 10 min | [postura do prof] |
| 6 | Veredito do júri | 5 min | [como acolher] |
| 7 | **Debriefing técnico (CRÍTICO)** | 25 min | [pontos-chave a fechar com a turma] |

---

# REGRAS OBRIGATÓRIAS
- ❌ NÃO produza listas com apenas títulos sem explicação. CADA item deve ter parágrafo explicativo.
- ✅ Tabelas DEVEM usar sintaxe GFM correta (cada linha numa linha, pipes alinhados, separador "|---|---|").
- ✅ Cite sempre artigos/leis/diretrizes específicas (não "diretrizes em geral").
- ✅ Use blockquotes (>) para destacar perguntas e respostas-modelo.
- ❌ NÃO repita o conteúdo do processo ipsis litteris — esse roteiro é COMPLEMENTAR.
- ✅ Tom: docente experiente conversando com colega professor.
- ❌ NÃO inclua meta-comentários ("aqui está", "espero ter ajudado"). Retorne APENAS o Markdown.`;

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
