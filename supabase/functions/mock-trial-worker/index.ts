// Mock-trial worker: runs one or a few generation steps per invocation, persists
// partial progress to mock_trial_generation_jobs, then either re-invokes itself
// to continue (via EdgeRuntime.waitUntil) or finalizes the case. This avoids
// the 150s edge-function wall clock by splitting the heavy "generate full
// process" call into many small, validated steps.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---- AI helpers --------------------------------------------------------

type Tool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: any;
  };
};

async function callJson(opts: {
  system: string;
  user: string;
  tool: Tool;
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<{ ok: true; data: any } | { ok: false; error: string; status?: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 110_000);
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model || "google/gemini-2.5-pro",
        max_tokens: opts.maxTokens ?? 8000,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        tools: [opts.tool],
        tool_choice: { type: "function", function: { name: opts.tool.function.name } },
      }),
    });
    clearTimeout(timer);
    if (!resp.ok) {
      const txt = await resp.text();
      return { ok: false, status: resp.status, error: `AI ${resp.status}: ${txt.slice(0, 300)}` };
    }
    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === "string") {
        const m = content.match(/\{[\s\S]*\}/);
        if (m) return { ok: true, data: JSON.parse(m[0]) };
      }
      return { ok: false, error: "AI returned no tool_call" };
    }
    return { ok: true, data: typeof args === "string" ? JSON.parse(args) : args };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, error: (e as Error).message };
  }
}

// ---- validation --------------------------------------------------------

function findPlaceholders(text: string): string[] {
  if (!text) return [];
  const sanitized = text.replace(/\[\[IMAGE:[^\]]+\]\]/g, "");
  const patterns = [
    /\[(?:Nome|Data|Universidade|Curso|Cidade|registro|Registro|M[íi]nimo|Conforme|Use|Narrativa|Tabelas?|Texto completo|descri[çc][ãa]o|Cidade|Profiss[ãa]o)[^\]]*\]/gi,
  ];
  return patterns.flatMap((p) => sanitized.match(p) || []).slice(0, 8);
}

function validateText(label: string, text: string, minWords: number, issues: string[]) {
  if (!text || !text.trim()) {
    issues.push(`${label}: vazio`);
    return;
  }
  const words = text.trim().split(/\s+/).length;
  if (words < minWords) {
    issues.push(`${label}: muito curto (${words} palavras, mínimo ${minWords})`);
  }
  const ph = findPlaceholders(text);
  if (ph.length) issues.push(`${label}: placeholders [${ph.join(", ")}]`);
  const trimmed = text.trim();
  if (!/[.!?\"”)]\s*$/.test(trimmed)) {
    issues.push(`${label}: parece truncado no final`);
  }
}

// ---- step prompts ------------------------------------------------------

const ROOT_RULES = `Você é Promotor + Médico-Perito + Professor universitário, redigindo um processo judicial simulado (Ação Penal Pública) clínico para Júri Simulado de graduação em saúde. Cada peça precisa parecer EMITIDA POR INSTITUIÇÃO REAL, com nomes próprios, datas reais, dados clínicos reais, tabelas, posologia, conselhos profissionais corretos. JAMAIS retorne placeholders entre colchetes que descrevam o que deveria estar ali (ex: "[Mínimo X palavras]", "[Conforme...]", "[Nome]"). O ÚNICO colchete permitido é [[IMAGE:slug]]. Tudo que você gera é o conteúdo final que será lido pelos alunos.

PRINCÍPIOS OBRIGATÓRIOS:
- Neutralidade: ambos os lados encontram munição.
- 8-12 easter eggs distribuídos: contradições sutis, alergias omitidas, horários conflitantes, doses erradas, assinaturas ausentes.
- Plot twist clínico real na evolução.
- Diversidade do réu: pode ser médico(a), enfermeiro(a), farmacêutico(a), dentista, fisioterapeuta, nutricionista, biomédico(a). O Código de Ética citado deve ser o da profissão do réu.
- Cite literatura real (Mandell, Harrison, Goodman & Gilman, diretrizes SBC/SBI/SBP/SBD, Ministério da Saúde, RDCs ANVISA, CLSI/BrCAST, qSOFA/SIRS/CURB-65/APACHE II quando pertinente).
`;

function buildBlueprintPrompt(objectives: string, caseNumber: string, pdfContent?: string) {
  return `${ROOT_RULES}

Você está PLANEJANDO um processo judicial simulado. NÃO escreva o processo agora — apenas planeje sua estrutura completa, em uma única chamada de função estruturada.

OBJETIVOS DE APRENDIZAGEM: ${objectives || "(não especificados)"}
NÚMERO DO PROCESSO: ${caseNumber}
${pdfContent ? `\nMATERIAL DE REFERÊNCIA (PDF da aula):\n${pdfContent.slice(0, 6000)}` : ""}

Defina:
- title (título completo do processo, ex.: "Ação Penal Pública: Negligência ...")
- university, faculty (Faculdade fictícia mas plausível, com curso correspondente à profissão do réu), city
- case_summary (5-10 linhas descrevendo o caso clínico-jurídico)
- defendant: nome completo, profissão, conselho/registro fictício (ex.: CRM 12345), local de trabalho, especialidade
- victim: nome, idade, sexo, comorbidades principais, profissão
- timeline: 5-10 marcos cronológicos com data e o que aconteceu
- learning_objectives_internal: lista de 3-6 objetivos de aprendizagem específicos
- legal_framework: artigos do Código Penal aplicáveis (números) e código de ética da profissão do réu
- planned_annexes: ARRAY DE 6 ANEXOS — cada um com slug, title, kind (denuncia | depoimento | prontuario | laudos | pericia | imagem | outro), short_brief (1-3 linhas do que vai conter)
- planned_witnesses: 4 testemunhas técnicas (2 acusação + 2 defesa) com name, profession (mesma área que o réu ou correlata), side, focus
- planned_image_attachments: 1-3 imagens médicas a embutir (slug, title, prompt em inglês detalhado, caption em PT, anchor "[[IMAGE:slug]]")
- easter_eggs: lista de 8-12 contradições/detalhes propositais a serem espalhados
- plot_twist: descrição da reviravolta clínica
`;
}

const BLUEPRINT_TOOL: Tool = {
  type: "function",
  function: {
    name: "submit_blueprint",
    description: "Submete o blueprint completo do processo planejado",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        university: { type: "string" },
        faculty: { type: "string" },
        city: { type: "string" },
        case_summary: { type: "string" },
        defendant: {
          type: "object",
          properties: {
            name: { type: "string" },
            profession: { type: "string" },
            registry: { type: "string" },
            workplace: { type: "string" },
            specialty: { type: "string" },
          },
          required: ["name", "profession", "registry", "workplace", "specialty"],
        },
        victim: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" },
            sex: { type: "string" },
            comorbidities: { type: "string" },
            occupation: { type: "string" },
          },
          required: ["name", "age", "sex", "comorbidities", "occupation"],
        },
        timeline: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              event: { type: "string" },
            },
            required: ["date", "event"],
          },
        },
        learning_objectives_internal: { type: "array", items: { type: "string" } },
        legal_framework: {
          type: "object",
          properties: {
            penal_articles: { type: "array", items: { type: "string" } },
            ethics_code: { type: "string" },
            council: { type: "string" },
          },
          required: ["penal_articles", "ethics_code", "council"],
        },
        planned_annexes: {
          type: "array",
          minItems: 6,
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              slug: { type: "string" },
              title: { type: "string" },
              kind: { type: "string" },
              short_brief: { type: "string" },
            },
            required: ["slug", "title", "kind", "short_brief"],
          },
        },
        planned_witnesses: {
          type: "array",
          minItems: 4,
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              profession: { type: "string" },
              side: { type: "string", enum: ["prosecution", "defense"] },
              focus: { type: "string" },
            },
            required: ["name", "profession", "side", "focus"],
          },
        },
        planned_image_attachments: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              slug: { type: "string" },
              title: { type: "string" },
              prompt: { type: "string" },
              caption: { type: "string" },
              anchor: { type: "string" },
            },
            required: ["slug", "title", "prompt", "caption", "anchor"],
          },
        },
        easter_eggs: { type: "array", items: { type: "string" } },
        plot_twist: { type: "string" },
      },
      required: [
        "title",
        "university",
        "faculty",
        "city",
        "case_summary",
        "defendant",
        "victim",
        "timeline",
        "legal_framework",
        "planned_annexes",
        "planned_witnesses",
        "easter_eggs",
        "plot_twist",
      ],
    },
  },
};

function bpContext(bp: any): string {
  return `CONTEXTO DO PROCESSO (USE SEMPRE ESTES DADOS — nunca invente nomes diferentes):
- Universidade: ${bp.university} / ${bp.faculty} / ${bp.city}
- Réu: ${bp.defendant.name} (${bp.defendant.profession}, ${bp.defendant.registry}, ${bp.defendant.workplace}, especialidade ${bp.defendant.specialty})
- Vítima: ${bp.victim.name}, ${bp.victim.age} anos, ${bp.victim.sex}, comorbidades: ${bp.victim.comorbidities}
- Resumo do caso: ${bp.case_summary}
- Cronologia:
${(bp.timeline || []).map((t: any) => `  - ${t.date}: ${t.event}`).join("\n")}
- Conselho profissional do réu: ${bp.legal_framework.council}
- Código de ética: ${bp.legal_framework.ethics_code}
- Artigos penais: ${(bp.legal_framework.penal_articles || []).join(", ")}
- Plot twist: ${bp.plot_twist}
- Easter eggs a espalhar: ${(bp.easter_eggs || []).slice(0, 12).join(" | ")}
`;
}

const TEXT_TOOL = (key: string, label: string): Tool => ({
  type: "function",
  function: {
    name: `submit_${key}`,
    description: `Submete o texto completo da seção ${label} (Markdown).`,
    parameters: {
      type: "object",
      properties: { content: { type: "string", description: "Markdown completo da seção" } },
      required: ["content"],
    },
  },
});

// ---- step generators ---------------------------------------------------

async function genRelato(bp: any) {
  const sys = ROOT_RULES;
  const user = `${bpContext(bp)}

ESCREVA AGORA a seção "## Relato dos Fatos" do processo, em Markdown denso. Mínimo 350 palavras. Inclua: data específica, nome real do paciente, comorbidade nominada, conduta do réu nominalmente descrita (medicação + posologia / procedimento), desfecho clínico claro, conexão causal explícita. NÃO use placeholders. Termine a seção com pontuação correta.`;
  return callJson({
    system: sys,
    user,
    tool: TEXT_TOOL("relato", "Relato dos Fatos"),
    maxTokens: 3500,
    timeoutMs: 100_000,
  });
}

async function genFundamentacao(bp: any) {
  const user = `${bpContext(bp)}

ESCREVA AGORA "## Fundamentação Jurídica" em Markdown denso (mínimo 400 palavras). Transcreva o TEXTO de cada artigo do Código Penal aplicável (${(bp.legal_framework.penal_articles || []).join(", ")}). Cite o ${bp.legal_framework.ethics_code} (${bp.legal_framework.council}) com pelo menos 4 artigos transcritos. Organize por diploma legal. NÃO use placeholders.`;
  return callJson({
    system: ROOT_RULES,
    user,
    tool: TEXT_TOOL("fundamentacao", "Fundamentação Jurídica"),
    maxTokens: 3500,
    timeoutMs: 100_000,
  });
}

async function genDenuncia(bp: any) {
  const user = `${bpContext(bp)}

ESCREVA AGORA "## Denúncia" no padrão jurídico real (mínimo 400 palavras). Comece com vocativo "**Excelentíssimo Senhor Juiz de Direito da Vara Criminal da ${bp.faculty} da ${bp.university}**". Qualifique o réu (${bp.defendant.name}, ${bp.defendant.registry}). Liste fatos numerados em bullets cronológicos com datas reais. Termine com pedido condenatório citando os artigos ${(bp.legal_framework.penal_articles || []).join(", ")} c/c ${bp.legal_framework.ethics_code}, "Nestes termos, Pede deferimento", ${bp.city}, data por extenso. NÃO use placeholders.`;
  return callJson({
    system: ROOT_RULES,
    user,
    tool: TEXT_TOOL("denuncia", "Denúncia"),
    maxTokens: 3500,
    timeoutMs: 100_000,
  });
}

async function genListaProvas(bp: any) {
  const annexes = (bp.planned_annexes || [])
    .map((a: any, i: number) => `${i + 1}. ${a.title}`)
    .join("\n");
  const user = `${bpContext(bp)}

ESCREVA AGORA "## Lista de Provas" em Markdown. Liste numericamente cada anexo (1 a ${(bp.planned_annexes || []).length}) com título e 1 frase descritiva. Use exatamente esta ordem:
${annexes}
Não use placeholders.`;
  return callJson({
    system: ROOT_RULES,
    user,
    tool: TEXT_TOOL("lista_provas", "Lista de Provas"),
    maxTokens: 1500,
    timeoutMs: 60_000,
  });
}

async function genAnnex(bp: any, annex: any, index: number, allAnnexes: any[]) {
  const kind = (annex.kind || "outro").toLowerCase();
  const minWords = kind.includes("depoimento") ? 700 :
                   kind.includes("pericia") ? 800 :
                   kind.includes("prontuario") ? 900 :
                   kind.includes("laudo") ? 500 :
                   kind.includes("denuncia") ? 500 :
                   400;

  const imageAnchorsForThis = (bp.planned_image_attachments || []).filter((img: any) =>
    kind.includes("imagem") || kind.includes("imagen") || annex.title.toLowerCase().includes("imagem"),
  );

  const imageHint = imageAnchorsForThis.length > 0
    ? `\nESTE ANEXO contém imagens. Inclua os anchors literais a seguir, cada um seguido de uma legenda Markdown:\n${imageAnchorsForThis.map((i: any) => `- ${i.anchor} (legenda: ${i.caption})`).join("\n")}`
    : "";

  const kindHint = kind.includes("depoimento")
    ? `Estrutura: abertura formal "Eu, [nome completo], [registro], venho por meio deste prestar meu depoimento no processo nº ${bp.case_number || ""}". Cronologia hora a hora (mínimo 8 marcos com horários específicos). Mínimo 4 diálogos transcritos entre as partes. Justificativa técnica com protocolos institucionais fictícios mas plausíveis. Estado emocional. Easter eggs propositais (contradições com outros documentos). Encerramento formal com assinatura, registro e data.`
    : kind.includes("prontuario")
      ? `Estrutura completa de prontuário hospitalar real: cabeçalho institucional com hospital fictício/CNES/endereço; identificação completa; HPP detalhada; medicações em uso; ALERGIAS destacadas; hábitos; HDA; exame físico POR SISTEMA com sinais vitais; hipóteses diagnósticas; conduta inicial datada e horada; mínimo 5 evoluções DATADAS no formato SOAP mostrando o plot twist; notas de enfermagem por turno; resultados de exames em tabelas Markdown.`
      : kind.includes("laudo")
      ? `Cabeçalho de laboratório fictício (nome, CNPJ, responsável técnico com registro). Dados do paciente. Resultados completos em tabelas Markdown. Se houver cultura: ANTIBIOGRAMA com mínimo 12 antibióticos, colunas Antimicrobiano | Concentração (µg/mL) | Resultado (S/I/R) | Interpretação. Hemograma completo com VCM/HCM/CHCM/RDW/diferencial. Bioquímica relevante. Responsável técnico nominado.`
      : kind.includes("pericia")
      ? `Laudo de Perícia. Cabeçalho com nº do processo. Qualifique o perito (nome, registro DA MESMA PROFISSÃO DO RÉU: ${bp.defendant.profession}, especialidade). Quesitos numerados. Metodologia citando livros-texto reais e diretrizes (Mandell/Harrison/Goodman & Gilman/SBI/SBC/CLSI). Discussão técnica fundamentada. Conclusão respondendo cada quesito. Assinatura.`
      : "";

  const user = `${bpContext(bp)}

ESCREVA AGORA o ANEXO ${index + 1} de ${allAnnexes.length} do processo, em Markdown denso (mínimo ${minWords} palavras).

Cabeçalho obrigatório do anexo: "## ANEXO ${index + 1} — ${annex.title}"
Tipo: ${annex.kind}
Briefing: ${annex.short_brief}
${kindHint}${imageHint}

NÃO inclua "## Relato", "## Fundamentação", "## Denúncia" ou outros anexos aqui — apenas este anexo.
NÃO use placeholders entre colchetes (exceto [[IMAGE:slug]] quando aplicável).
Termine com pontuação correta. NÃO escreva "[continua]" nem "[ver acima]".`;

  return callJson({
    system: ROOT_RULES,
    user,
    tool: TEXT_TOOL(`annex_${index}`, `Anexo ${index + 1}`),
    maxTokens: 6500,
    timeoutMs: 130_000,
  });
}

async function genCharacters(bp: any) {
  const witnesses = (bp.planned_witnesses || [])
    .map((w: any) => `- ${w.name} (${w.profession}, lado: ${w.side}) — foco: ${w.focus}`)
    .join("\n");
  const user = `${bpContext(bp)}

Gere as TESTEMUNHAS TÉCNICAS finais (4 personagens). Para cada testemunha, "instructions" deve ser uma LISTA DE 5–8 PERGUNTAS SOCRÁTICAS NUMERADAS em segunda pessoa ("você"), provocando reflexão sobre: (a) provas que sustentam sua tese; (b) diretrizes/literatura citáveis; (c) contradições do lado oposto; (d) como reagir se confrontado; (e) raciocínio clínico. NÃO escreva o que a testemunha vai responder. Use os planejamentos:
${witnesses}`;

  const tool: Tool = {
    type: "function",
    function: {
      name: "submit_characters",
      description: "Submete a lista de testemunhas técnicas",
      parameters: {
        type: "object",
        properties: {
          characters: {
            type: "array",
            minItems: 4,
            items: {
              type: "object",
              properties: {
                side: { type: "string", enum: ["prosecution", "defense"] },
                name: { type: "string" },
                profession: { type: "string" },
                instructions: { type: "string" },
              },
              required: ["side", "name", "profession", "instructions"],
            },
          },
        },
        required: ["characters"],
      },
    },
  };
  return callJson({
    system: ROOT_RULES,
    user,
    tool,
    maxTokens: 3000,
    timeoutMs: 80_000,
  });
}

// ---- assembly ----------------------------------------------------------

function assembleProcessContent(bp: any, sec: any): string {
  const parts: string[] = [];
  parts.push(`# ${bp.title}\n`);
  parts.push(`**Tribunal:** ${bp.faculty} da ${bp.university}\n`);
  parts.push(`**Vara Criminal — Comarca de ${bp.city}**\n`);
  parts.push(`**Processo nº:** ${sec.case_number || ""}\n`);
  parts.push(`**Tipo de Ação:** Ação Penal Pública\n`);
  parts.push(`**Réu:** ${bp.defendant.name} (${bp.defendant.profession}, ${bp.defendant.registry})\n`);
  parts.push(`**Vítima:** ${bp.victim.name}, ${bp.victim.age} anos\n\n---\n`);
  if (sec.relato) parts.push(`## Relato dos Fatos\n\n${sec.relato.replace(/^##\s*Relato dos Fatos\s*\n?/i, "")}\n`);
  if (sec.fundamentacao) parts.push(`## Fundamentação Jurídica\n\n${sec.fundamentacao.replace(/^##\s*Fundamenta[çc][ãa]o\s*Jur[íi]dica\s*\n?/i, "")}\n`);
  if (sec.denuncia) parts.push(`## Denúncia\n\n${sec.denuncia.replace(/^##\s*Den[úu]ncia\s*\n?/i, "")}\n`);
  if (sec.lista_provas) parts.push(`## Lista de Provas\n\n${sec.lista_provas.replace(/^##\s*Lista de Provas\s*\n?/i, "")}\n`);
  for (let i = 0; i < (sec.annexes || []).length; i++) {
    const a = sec.annexes[i];
    if (a) parts.push(`\n${a.replace(/^##\s*ANEXO\s*\d+/i, `## ANEXO ${i + 1}`)}\n`);
  }
  return parts.join("\n");
}

// ---- worker driver -----------------------------------------------------

async function loadJob(jobId: string) {
  const { data, error } = await sb
    .from("mock_trial_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  if (error || !data) throw new Error(`Job ${jobId} não encontrado`);
  return data;
}

async function updateJob(jobId: string, patch: Record<string, any>) {
  await sb.from("mock_trial_generation_jobs").update(patch).eq("id", jobId);
}

function reinvokeSelf(jobId: string) {
  fetch(`${SUPABASE_URL}/functions/v1/mock-trial-worker`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jobId }),
  }).catch((e) => console.error("reinvoke failed:", (e as Error).message));
}

async function runOneStep(jobId: string): Promise<{ done: boolean; failed?: boolean }> {
  const job = await loadJob(jobId);
  if (job.status === "completed" || job.status === "failed") return { done: true };

  const bp = job.blueprint_json;
  const sec = (job.sections_json || {}) as any;

  // --- Step 1: Blueprint ---
  if (!bp) {
    await updateJob(jobId, {
      status: "planning",
      current_step: "Planejando estrutura do processo",
      progress: 5,
    });
    const r = await callJson({
      system: ROOT_RULES,
      user: buildBlueprintPrompt(job.learning_objectives || "", job.case_number || "001/2026", job.pdf_content || ""),
      tool: BLUEPRINT_TOOL,
      maxTokens: 5000,
      timeoutMs: 120_000,
    });
    if (!r.ok) {
      await updateJob(jobId, {
        status: "failed",
        last_error: r.error,
        current_step: "Falha ao planejar processo",
        finished_at: new Date().toISOString(),
      });
      return { done: true, failed: true };
    }
    const planned = r.data;
    const total = 4 /* relato/fund/denuncia/lista */ + (planned.planned_annexes || []).length + 1 /* characters */ + 1 /* assemble */;
    await updateJob(jobId, {
      blueprint_json: planned,
      total_steps: total,
      completed_steps: 1,
      progress: Math.round((1 / total) * 100),
      current_step: "Estrutura planejada — gerando seções",
      status: "generating_section",
    });
    return { done: false };
  }

  // --- Step 2: Relato ---
  if (!sec.relato) {
    await updateJob(jobId, { status: "generating_section", current_step: "Gerando: Relato dos Fatos" });
    const r = await genRelato(bp);
    if (!r.ok) {
      await updateJob(jobId, { status: "failed", last_error: r.error, finished_at: new Date().toISOString() });
      return { done: true, failed: true };
    }
    const issues: string[] = [];
    validateText("Relato", r.data.content, 250, issues);
    sec.relato = r.data.content;
    const completed = (job.completed_steps || 0) + 1;
    await updateJob(jobId, {
      sections_json: sec,
      completed_steps: completed,
      progress: Math.round((completed / job.total_steps) * 100),
      validation_issues: [...(job.validation_issues || []), ...issues],
    });
    return { done: false };
  }

  // --- Step 3: Fundamentação ---
  if (!sec.fundamentacao) {
    await updateJob(jobId, { current_step: "Gerando: Fundamentação Jurídica" });
    const r = await genFundamentacao(bp);
    if (!r.ok) {
      await updateJob(jobId, { status: "failed", last_error: r.error, finished_at: new Date().toISOString() });
      return { done: true, failed: true };
    }
    const issues: string[] = [];
    validateText("Fundamentação", r.data.content, 250, issues);
    sec.fundamentacao = r.data.content;
    const completed = (job.completed_steps || 0) + 1;
    await updateJob(jobId, {
      sections_json: sec,
      completed_steps: completed,
      progress: Math.round((completed / job.total_steps) * 100),
      validation_issues: [...(job.validation_issues || []), ...issues],
    });
    return { done: false };
  }

  // --- Step 4: Denúncia ---
  if (!sec.denuncia) {
    await updateJob(jobId, { current_step: "Gerando: Denúncia" });
    const r = await genDenuncia(bp);
    if (!r.ok) {
      await updateJob(jobId, { status: "failed", last_error: r.error, finished_at: new Date().toISOString() });
      return { done: true, failed: true };
    }
    const issues: string[] = [];
    validateText("Denúncia", r.data.content, 250, issues);
    sec.denuncia = r.data.content;
    const completed = (job.completed_steps || 0) + 1;
    await updateJob(jobId, {
      sections_json: sec,
      completed_steps: completed,
      progress: Math.round((completed / job.total_steps) * 100),
      validation_issues: [...(job.validation_issues || []), ...issues],
    });
    return { done: false };
  }

  // --- Step 5: Lista de Provas ---
  if (!sec.lista_provas) {
    await updateJob(jobId, { current_step: "Gerando: Lista de Provas" });
    const r = await genListaProvas(bp);
    if (!r.ok) {
      await updateJob(jobId, { status: "failed", last_error: r.error, finished_at: new Date().toISOString() });
      return { done: true, failed: true };
    }
    sec.lista_provas = r.data.content;
    const completed = (job.completed_steps || 0) + 1;
    await updateJob(jobId, {
      sections_json: sec,
      completed_steps: completed,
      progress: Math.round((completed / job.total_steps) * 100),
    });
    return { done: false };
  }

  // --- Step 6..N: Anexos individuais ---
  const planned = bp.planned_annexes || [];
  if (!sec.annexes) sec.annexes = [];
  const idx = sec.annexes.findIndex((x: any) => !x);
  let nextIdx = idx;
  if (nextIdx === -1 && sec.annexes.length < planned.length) nextIdx = sec.annexes.length;
  if (nextIdx >= 0 && nextIdx < planned.length) {
    const annex = planned[nextIdx];
    await updateJob(jobId, {
      current_step: `Gerando Anexo ${nextIdx + 1} de ${planned.length}: ${annex.title}`,
      status: "generating_annex",
    });
    const r = await genAnnex(bp, annex, nextIdx, planned);
    if (!r.ok) {
      const r2 = await genAnnex(bp, annex, nextIdx, planned);
      if (!r2.ok) {
        await updateJob(jobId, { status: "failed", last_error: `Anexo ${nextIdx + 1}: ${r2.error}`, finished_at: new Date().toISOString() });
        return { done: true, failed: true };
      }
      sec.annexes[nextIdx] = r2.data.content;
    } else {
      sec.annexes[nextIdx] = r.data.content;
    }
    const issues: string[] = [];
    validateText(`Anexo ${nextIdx + 1}`, sec.annexes[nextIdx], 350, issues);
    const completed = (job.completed_steps || 0) + 1;
    await updateJob(jobId, {
      sections_json: sec,
      completed_steps: completed,
      progress: Math.round((completed / job.total_steps) * 100),
      validation_issues: [...(job.validation_issues || []), ...issues],
    });
    return { done: false };
  }

  // --- Step N+1: characters ---
  if (!sec.characters) {
    await updateJob(jobId, { current_step: "Gerando testemunhas técnicas" });
    const r = await genCharacters(bp);
    if (!r.ok) {
      await updateJob(jobId, { status: "failed", last_error: r.error, finished_at: new Date().toISOString() });
      return { done: true, failed: true };
    }
    sec.characters = r.data.characters;
    const completed = (job.completed_steps || 0) + 1;
    await updateJob(jobId, {
      sections_json: sec,
      completed_steps: completed,
      progress: Math.round((completed / job.total_steps) * 100),
    });
    return { done: false };
  }

  // --- Final: assemble + persist case ---
  await updateJob(jobId, { status: "assembling", current_step: "Montando processo final" });
  const processContent = assembleProcessContent(bp, { ...sec, case_number: job.case_number });
  const imageAttachments = (bp.planned_image_attachments || []).slice(0, 3);

  let caseId = job.case_id as string | null;
  if (job.mode === "regenerate" && caseId) {
    await sb.from("mock_trial_cases").update({
      title: bp.title,
      process_content: processContent,
      characters_json: sec.characters || [],
      generation_status: "ready",
    }).eq("id", caseId);
    await sb.from("mock_trial_case_images").delete().eq("case_id", caseId);
  } else {
    const { data: trialCases } = await sb
      .from("mock_trial_cases")
      .select("id")
      .eq("mock_trial_id", job.mock_trial_id);
    const position = (trialCases || []).length;
    const { data: inserted, error: insErr } = await sb.from("mock_trial_cases").insert({
      mock_trial_id: job.mock_trial_id,
      position,
      case_number: job.case_number || `${String(position + 1).padStart(3, "0")}/${new Date().getFullYear()}`,
      title: bp.title,
      process_content: processContent,
      learning_objectives: job.learning_objectives,
      characters_json: sec.characters || [],
      generation_status: "ready",
    }).select().single();
    if (insErr) {
      await updateJob(jobId, { status: "failed", last_error: insErr.message, finished_at: new Date().toISOString() });
      return { done: true, failed: true };
    }
    caseId = inserted.id;
  }

  if (caseId && imageAttachments.length) {
    const rows = imageAttachments.map((a: any) => ({
      case_id: caseId,
      slug: a.slug,
      anchor: a.anchor || `[[IMAGE:${a.slug}]]`,
      title: a.title || "",
      caption: a.caption || "",
      prompt: a.prompt || a.title || "",
      status: "pending",
    }));
    const { data: imgRows } = await sb.from("mock_trial_case_images").insert(rows).select();
    for (const r of imgRows || []) {
      fetch(`${SUPABASE_URL}/functions/v1/generate-mock-trial-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId: r.id }),
      }).catch((e) => console.error("image trigger failed:", (e as Error).message));
    }
  }

  await updateJob(jobId, {
    status: "completed",
    current_step: "Processo concluído",
    progress: 100,
    completed_steps: job.total_steps,
    case_id: caseId,
    result_case_id: caseId,
    finished_at: new Date().toISOString(),
  });
  return { done: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await runOneStep(jobId);
    if (!result.done) {
      // @ts-ignore EdgeRuntime is provided by Supabase
      if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(Promise.resolve().then(() => reinvokeSelf(jobId)));
      } else {
        reinvokeSelf(jobId);
      }
    }
    return new Response(JSON.stringify({ ok: true, done: result.done, failed: !!result.failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("mock-trial-worker error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
