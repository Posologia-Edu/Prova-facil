// Mock-trial worker: runs one or a few generation steps per invocation, persists
// partial progress to mock_trial_generation_jobs, then either re-invokes itself
// to continue (via EdgeRuntime.waitUntil) or finalizes the case. This avoids
// the 150s edge-function wall clock by splitting the heavy "generate full
// process" call into many small, validated steps.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
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

function extractMessageText(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item?.text === "string") return item.text;
        return "";
      })
      .join("\n")
      .trim();
  }
  return "";
}

function extractFirstJsonObject(text: string): string | null {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

function parseStructuredContentToArgs(rawText: string, tool: Tool): any | null {
  const text = rawText.trim();
  if (!text) return null;

  const singleContentField =
    Object.keys(tool.function.parameters?.properties || {}).length === 1 &&
    !!tool.function.parameters?.properties?.content;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidates = [fenced, text, extractFirstJsonObject(text)].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      // ignore and try the next strategy
    }
  }

  if (singleContentField) {
    return { content: text };
  }

  return null;
}

function extractToolArgs(data: any): { args: any | null; rawText: string } {
  const message = data?.choices?.[0]?.message;
  const args = message?.tool_calls?.[0]?.function?.arguments ?? null;
  const rawText = extractMessageText(message?.content);
  return { args, rawText };
}

async function coerceRawTextToToolArgs(rawText: string, tool: Tool): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  const direct = parseStructuredContentToArgs(rawText, tool);
  if (direct) return { ok: true, data: direct };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 3000,
        messages: [
          {
            role: "system",
            content:
              "Transforme a saída abaixo nos argumentos exatos da função indicada. Preserve o conteúdo original. Se o texto já for a resposta final de uma seção, mapeie-o para o campo correto do schema.",
          },
          {
            role: "user",
            content: `Função alvo: ${tool.function.name}\nSchema esperado:\n${JSON.stringify(tool.function.parameters)}\n\nSaída original:\n${rawText}`,
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });

    clearTimeout(timer);

    if (!resp.ok) {
      const txt = await resp.text();
      return { ok: false, error: `Fallback AI ${resp.status}: ${txt.slice(0, 300)}` };
    }

    const data = await resp.json();
    const extracted = extractToolArgs(data);
    if (extracted.args) {
      return {
        ok: true,
        data: typeof extracted.args === "string" ? JSON.parse(extracted.args) : extracted.args,
      };
    }

    const parsed = parseStructuredContentToArgs(extracted.rawText, tool);
    if (parsed) return { ok: true, data: parsed };

    return { ok: false, error: "AI returned no tool_call after fallback coercion" };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, error: (e as Error).message };
  }
}

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
    const extracted = extractToolArgs(data);
    if (extracted.args) {
      return { ok: true, data: typeof extracted.args === "string" ? JSON.parse(extracted.args) : extracted.args };
    }

    const direct = parseStructuredContentToArgs(extracted.rawText, opts.tool);
    if (direct) {
      return { ok: true, data: direct };
    }

    const recovered = await coerceRawTextToToolArgs(extracted.rawText, opts.tool);
    if (recovered.ok) {
      return recovered;
    }

    return {
      ok: false,
      error: recovered.error || `AI returned no tool_call (${extracted.rawText.slice(0, 160)})`,
    };
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

function isPdfBase64Like(content?: string | null): boolean {
  const text = (content || "").trim();
  if (text.length < 1000) return false;
  const compact = text.replace(/\s+/g, "");
  return compact.startsWith("JVBER") && /^[A-Za-z0-9+/=]+$/.test(compact.slice(0, Math.min(compact.length, 5000)));
}

function buildBlueprintPrompt(objectives: string, caseNumber: string, pdfContent?: string) {
  const referenceContent = isPdfBase64Like(pdfContent) ? "" : (pdfContent || "");
  return `${ROOT_RULES}

Você está PLANEJANDO um processo judicial simulado. NÃO escreva o processo agora — apenas planeje sua estrutura completa, em uma única chamada de função estruturada.

==== OBJETIVOS DE APRENDIZAGEM (REGRA INVIOLÁVEL) ====
${objectives || "(não especificados)"}
==== FIM DOS OBJETIVOS ====

REGRA CRÍTICA #1: O caso clínico DEVE versar EXATAMENTE sobre o conteúdo descrito nos objetivos acima. O quadro clínico da vítima, o medicamento/procedimento envolvido, a especialidade do réu e o erro técnico discutido PRECISAM corresponder literalmente ao tema dos objetivos. PROIBIDO inventar um caso de tema diferente (ex.: se o objetivo fala em "fosfomicina/pielonefrite/diabético", o caso PRECISA ser sobre infecção urinária alta tratada com fosfomicina em paciente diabético — JAMAIS sobre odontologia estética, harmonização orofacial, cirurgia plástica ou qualquer outro tema não citado).

REGRA CRÍTICA #2: O title DEVE conter, em linguagem natural, a doença/medicamento/procedimento citado nos objetivos. Exemplos: "Ação Penal Pública: Falha terapêutica com Fosfomicina em pielonefrite de paciente diabético". NUNCA use títulos genéricos tipo "A aventura de X em ...".

REGRA CRÍTICA #3: A profissão do réu deve ser COMPATÍVEL com o tema. Tema clínico/farmacológico → médico, farmacêutico, enfermeiro. Tema odontológico → dentista. Tema fisioterápico → fisioterapeuta. Etc. NÃO escolha uma profissão aleatória.

REGRA CRÍTICA #4: planned_image_attachments é OBRIGATÓRIO conter EXATAMENTE 2 a 3 imagens médicas pertinentes ao tema (ex.: ultrassom renal, urocultura, tomografia de abdome para pielonefrite). NUNCA retorne array vazio.

NÚMERO DO PROCESSO: ${caseNumber}
${referenceContent ? `\nMATERIAL DE REFERÊNCIA (PDF da aula):\n${referenceContent.slice(0, 6000)}` : ""}

Defina:
- title (título completo do processo, OBRIGATORIAMENTE alinhado aos objetivos acima — ex.: "Ação Penal Pública: Negligência terapêutica no manejo de pielonefrite com Fosfomicina")
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
          minItems: 2,
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
        "planned_image_attachments",
        "easter_eggs",
        "plot_twist",
      ],
    },
  },
};

function inferRoleProfile(objectives: string) {
  const text = objectives.toLowerCase();
  if (/(odont|dente|bucal|periodont|endodont|ortodont)/i.test(text)) {
    return {
      profession: "Cirurgião-Dentista",
      registryPrefix: "CRO",
      specialty: "Odontologia Clínica",
      faculty: "Faculdade de Odontologia",
      council: "CFO",
      ethicsCode: "Código de Ética Odontológica",
    };
  }
  if (/(enferm|curativo|punção|cateter|sondagem)/i.test(text)) {
    return {
      profession: "Enfermeiro",
      registryPrefix: "COREN",
      specialty: "Enfermagem Clínica",
      faculty: "Faculdade de Enfermagem",
      council: "COFEN",
      ethicsCode: "Código de Ética dos Profissionais de Enfermagem",
    };
  }
  if (/(fisiot|reabilita|mobiliza|cinesioter)/i.test(text)) {
    return {
      profession: "Fisioterapeuta",
      registryPrefix: "CREFITO",
      specialty: "Fisioterapia Hospitalar",
      faculty: "Faculdade de Fisioterapia",
      council: "COFFITO",
      ethicsCode: "Código de Ética e Deontologia da Fisioterapia",
    };
  }
  if (/(nutri|dieta|enteral|parenteral|suplement)/i.test(text)) {
    return {
      profession: "Nutricionista",
      registryPrefix: "CRN",
      specialty: "Nutrição Clínica",
      faculty: "Faculdade de Nutrição",
      council: "CFN",
      ethicsCode: "Código de Ética e de Conduta do Nutricionista",
    };
  }
  if (/(biom[eé]d|an[aá]lise cl[ií]nica|microbiolog|citologia)/i.test(text)) {
    return {
      profession: "Biomédico",
      registryPrefix: "CRBM",
      specialty: "Patologia Clínica",
      faculty: "Faculdade de Biomedicina",
      council: "CFBM",
      ethicsCode: "Código de Ética do Profissional Biomédico",
    };
  }

  return {
    profession: "Médico",
    registryPrefix: "CRM",
    specialty: /(infect|antibi|fosfomic|pielonef|urin|sepse)/i.test(text) ? "Infectologia" : "Clínica Médica",
    faculty: "Faculdade de Medicina",
    council: "CFM",
    ethicsCode: "Código de Ética Médica",
  };
}

function inferVictimProfile(objectives: string) {
  const text = objectives.toLowerCase();
  const male = /(\bhomem\b|masculin)/i.test(text);
  const female = /(\bmulher\b|feminin)/i.test(text);
  const sex = male ? "masculino" : female ? "feminino" : "masculino";
  const ageMatch = text.match(/(\d{2})\s*anos/);
  const age = ageMatch ? Number(ageMatch[1]) : /idos/i.test(text) ? 68 : 57;

  const comorbidities: string[] = [];
  if (/diab/i.test(text)) comorbidities.push("diabetes mellitus tipo 2");
  if (/(renal|drc|nefropat)/i.test(text)) comorbidities.push("doença renal crônica estágio 2");
  if (/(hipertens|has\b)/i.test(text)) comorbidities.push("hipertensão arterial sistêmica");
  if (!comorbidities.length) comorbidities.push("sem comorbidades relevantes previamente documentadas");

  return {
    name: male ? "Carlos Henrique de Souza" : female ? "Márcia Helena de Souza" : "Alexandre Martins Costa",
    age,
    sex,
    comorbidities: comorbidities.join("; "),
    occupation: male ? "motorista de aplicativo" : "auxiliar administrativa",
  };
}

function buildFallbackImageAttachments(objectives: string) {
  const text = objectives.toLowerCase();

  if (/(pielonef|urin|renal|fosfomic)/i.test(text)) {
    return [
      {
        slug: "usg-renal",
        title: "Ultrassonografia renal com sinais inflamatórios",
        prompt: "Realistic renal ultrasound exam from a hospital radiology department, adult male diabetic patient, subtle renal pelvis dilation, increased cortical echogenicity, grayscale medical imaging, authentic exam layout, no decorative text",
        caption: "Ultrassonografia renal demonstrando alterações inflamatórias compatíveis com infecção urinária alta.",
        anchor: "[[IMAGE:usg-renal]]",
      },
      {
        slug: "tc-abdome-contraste",
        title: "Tomografia contrastada com achados de pielonefrite",
        prompt: "Highly realistic contrast-enhanced abdominal CT scan, coronal view, findings compatible with acute pyelonephritis in an adult male diabetic patient, mild perinephric fat stranding, authentic radiology image, grayscale",
        caption: "Tomografia de abdome sugerindo pielonefrite com comprometimento perirrenal.",
        anchor: "[[IMAGE:tc-abdome-contraste]]",
      },
      {
        slug: "curva-glicemica",
        title: "Curva glicêmica hospitalar durante a internação",
        prompt: "Realistic hospital glycemic trend chart for an adult inpatient with diabetes and infection, clinical dashboard style, white background, authentic medical chart, no branding",
        caption: "Curva glicêmica hospitalar evidenciando descompensação metabólica durante a evolução infecciosa.",
        anchor: "[[IMAGE:curva-glicemica]]",
      },
    ];
  }

  if (/(odont|dente|bucal)/i.test(text)) {
    return [
      {
        slug: "rx-panoramica",
        title: "Radiografia panorâmica odontológica",
        prompt: "Highly realistic panoramic dental x-ray, subtle procedural complications visible, authentic grayscale radiology image, dental clinic style",
        caption: "Radiografia panorâmica anexada aos autos para correlação com a conduta discutida.",
        anchor: "[[IMAGE:rx-panoramica]]",
      },
      {
        slug: "foto-intraoral",
        title: "Fotografia intraoral padronizada",
        prompt: "Clinical intraoral photograph, realistic dental documentation, neutral lighting, visible lesion or complication, authentic medical record style",
        caption: "Fotografia intraoral padronizada do sítio relacionado ao evento clínico.",
        anchor: "[[IMAGE:foto-intraoral]]",
      },
    ];
  }

  return [
    {
      slug: "imagem-diagnostica-1",
      title: "Exame de imagem principal do caso",
      prompt: "Highly realistic hospital diagnostic imaging exam related to the described case, authentic grayscale medical image, clinically relevant abnormal finding, no decorative text",
      caption: "Exame de imagem principal anexado ao processo.",
      anchor: "[[IMAGE:imagem-diagnostica-1]]",
    },
    {
      slug: "imagem-diagnostica-2",
      title: "Imagem complementar para correlação clínica",
      prompt: "Realistic complementary medical imaging exam for a hospital legal case file, clinically coherent abnormal finding, authentic medical layout",
      caption: "Imagem complementar utilizada para correlação clínico-pericial.",
      anchor: "[[IMAGE:imagem-diagnostica-2]]",
    },
  ];
}

function buildDeterministicBlueprint(job: any) {
  const objectives = String(job.learning_objectives || "").trim();
  const profile = inferRoleProfile(objectives);
  const victim = inferVictimProfile(objectives);
  const caseNumber = job.case_number || "001/2026";
  const topic = objectives || "evento adverso clínico com controvérsia técnico-assistencial";
  const conciseTopic = topic.length > 110 ? `${topic.slice(0, 107).trim()}...` : topic;
  const dateBase = "2024";

  return {
    case_number: caseNumber,
    title: `Ação Penal Pública: Avaliação crítica de conduta em ${conciseTopic}`,
    university: "Universidade Integrada de Ciências da Saúde do Litoral",
    faculty: profile.faculty,
    city: "Campinas",
    case_summary: `O processo analisa a conduta profissional adotada em um caso centrado em ${topic}. A vítima apresentou evolução clínica desfavorável após decisão terapêutica discutível, exigindo reavaliação diagnóstica, revisão de evidências e correlação entre diretrizes assistenciais e responsabilidade profissional. Os autos foram estruturados para permitir argumentos plausíveis tanto para acusação quanto para defesa, com dados clínicos, cronologia detalhada e anexos periciais coerentes com o tema.`,
    defendant: {
      name: "Dr. Renato Augusto Ferraz",
      profession: profile.profession,
      registry: `${profile.registryPrefix} 18452`,
      workplace: "Hospital Escola São Gabriel",
      specialty: profile.specialty,
    },
    victim,
    timeline: [
      { date: `03/07/${dateBase}`, event: `Início dos sintomas relacionados ao tema central: ${topic}.` },
      { date: `04/07/${dateBase}`, event: "Primeiro atendimento com hipótese diagnóstica inicial e conduta terapêutica discutida nos autos." },
      { date: `05/07/${dateBase}`, event: "Persistência ou piora clínica, com novos dados laboratoriais e necessidade de reavaliação da estratégia adotada." },
      { date: `06/07/${dateBase}`, event: "Registro de divergência entre achados objetivos, evolução clínica e manutenção da conduta profissional questionada." },
      { date: `07/07/${dateBase}`, event: "Transferência ou internação para abordagem mais complexa, com documentação complementar por equipe multidisciplinar." },
      { date: `09/07/${dateBase}`, event: "Perícia interna e consolidação dos elementos técnico-científicos que embasam acusação e defesa." },
    ],
    learning_objectives_internal: objectives
      ? objectives.split(/[;\n]+/).map((item: string) => item.trim()).filter(Boolean).slice(0, 5)
      : ["Correlacionar conduta profissional, evidências e desfechos clínicos"],
    legal_framework: {
      penal_articles: ["Art. 121, §3º", "Art. 129, §6º", "Art. 132"],
      ethics_code: profile.ethicsCode,
      council: profile.council,
    },
    planned_annexes: [
      { slug: "admissao", title: "Prontuário de admissão e anamnese inicial", kind: "prontuario", short_brief: `Documento de admissão contendo quadro inicial, comorbidades e hipótese ligada a ${topic}.` },
      { slug: "evolucao", title: "Evoluções clínicas e prescrições sequenciais", kind: "prontuario", short_brief: "Sequência de evoluções com horários, prescrições, reavaliações e contradições sutis." },
      { slug: "laboratorio", title: "Laudo laboratorial e microbiológico", kind: "laudos", short_brief: "Exames objetivos que permitem confrontar a adequação da conduta adotada." },
      { slug: "imagem", title: "Laudo de imagem e documentação diagnóstica", kind: "imagem", short_brief: "Anexo com exames de imagem coerentes com o quadro clínico e anchors obrigatórios." },
      { slug: "depoimento", title: "Depoimento técnico do profissional assistente", kind: "depoimento", short_brief: "Versão do réu com justificativas clínicas, limitações contextuais e pontos de autodefesa." },
      { slug: "pericia", title: "Laudo pericial independente", kind: "pericia", short_brief: "Análise comparativa entre literatura, protocolos e a conduta efetivamente registrada." },
    ],
    planned_witnesses: [
      { name: "Dra. Helena Prado", profession: profile.profession, side: "prosecution", focus: "Avaliar onde a conduta se afastou das diretrizes e do padrão esperado." },
      { name: "Dr. Marcelo Vianna", profession: "Farmacêutico Clínico", side: "prosecution", focus: "Discutir segurança medicamentosa, posologia e riscos de manutenção terapêutica inadequada." },
      { name: "Dr. Luís Otávio Barreto", profession: profile.profession, side: "defense", focus: "Explicar decisões clínicas contextualizadas, limitações do cenário e plausibilidade da conduta." },
      { name: "Enf. Patrícia Nogueira", profession: "Enfermeira", side: "defense", focus: "Correlacionar sinais clínicos observados à beira-leito e a comunicação da equipe assistencial." },
    ],
    planned_image_attachments: buildFallbackImageAttachments(objectives),
    easter_eggs: [
      "Horário de administração de medicação divergente entre prescrição e evolução de enfermagem.",
      "Comorbidade importante aparece abreviada em um documento e descrita por extenso em outro.",
      "Valor laboratorial limítrofe ignorado em uma evolução médica.",
      "Assinatura digital ausente em uma das prescrições críticas.",
      "Registro de alergia medicamentosa aparece apenas em documento secundário.",
      "Escala clínica sugere maior gravidade do que a explicitada na alta.",
      "Intervalo entre coleta e liberação de exame muda discretamente entre anexos.",
      "Comunicação entre equipe assistencial e familiar foi registrada com versões conflitantes.",
    ],
    plot_twist: `Novo dado objetivo anexado posteriormente ao primeiro atendimento modifica a interpretação inicial do caso sobre ${topic}, permitindo argumentos tanto de negligência quanto de decisão clínica contextualizada.`,
  };
}

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

async function callLegacyFullCaseGenerator(job: any): Promise<{ ok: true; data: any } | { ok: false; error: string; status?: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 145_000);
  try {
    const body: Record<string, any> = {
      learningObjectives: job.learning_objectives || "",
      caseNumber: job.case_number || "001/2026",
    };

    if (job.pdf_content) {
      if (isPdfBase64Like(job.pdf_content)) body.pdfBase64 = job.pdf_content;
      else body.pdfContent = job.pdf_content;
    }

    const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-mock-trial`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    clearTimeout(timer);

    if (!resp.ok) {
      const txt = await resp.text();
      return { ok: false, status: resp.status, error: `Legacy generator ${resp.status}: ${txt.slice(0, 500)}` };
    }

    return { ok: true, data: await resp.json() };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, error: (e as Error).message };
  }
}

async function persistGeneratedCase(
  jobId: string,
  job: any,
  payload: { title: string; processContent: string; characters: any[]; imageAttachments: any[] },
): Promise<{ ok: true; caseId: string } | { ok: false; error: string }> {
  let caseId = job.case_id as string | null;

  if (job.mode === "regenerate" && caseId) {
    const { error } = await sb.from("mock_trial_cases").update({
      title: payload.title,
      process_content: payload.processContent,
      learning_objectives: job.learning_objectives,
      characters_json: payload.characters || [],
      generation_status: "ready",
    }).eq("id", caseId);

    if (error) return { ok: false, error: error.message };

    const { error: deleteErr } = await sb.from("mock_trial_case_images").delete().eq("case_id", caseId);
    if (deleteErr) return { ok: false, error: deleteErr.message };
  } else {
    const { data: trialCases, error: caseListErr } = await sb
      .from("mock_trial_cases")
      .select("id")
      .eq("mock_trial_id", job.mock_trial_id);

    if (caseListErr) return { ok: false, error: caseListErr.message };

    const position = (trialCases || []).length;
    const { data: inserted, error: insErr } = await sb.from("mock_trial_cases").insert({
      mock_trial_id: job.mock_trial_id,
      position,
      case_number: job.case_number || `${String(position + 1).padStart(3, "0")}/${new Date().getFullYear()}`,
      title: payload.title,
      process_content: payload.processContent,
      learning_objectives: job.learning_objectives,
      characters_json: payload.characters || [],
      generation_status: "ready",
    }).select().single();

    if (insErr || !inserted) return { ok: false, error: insErr?.message || "Falha ao criar processo" };
    caseId = inserted.id;
  }

  const imageAttachments = (payload.imageAttachments || []).slice(0, 3);
  if (caseId && imageAttachments.length) {
    const rows = imageAttachments.map((a: any) => ({
      case_id: caseId,
      slug: a.slug,
      anchor: a.anchor || `[[IMAGE:${a.slug}]]`,
      title: a.title || "",
      caption: a.caption || "",
      prompt: a.prompt || a.title || "",
      status: a.image_url ? "ready" : "pending",
      image_url: a.image_url || null,
      storage_path: a.storage_path || null,
    }));

    const { data: imgRows, error: imgErr } = await sb.from("mock_trial_case_images").insert(rows).select();
    if (imgErr) return { ok: false, error: imgErr.message };

    for (const r of imgRows || []) {
      if (r.image_url) continue;
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

  return { ok: true, caseId: caseId! };
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
    const objectives = job.learning_objectives || "";

    // Tenta até 2x; se o blueprint não bater com o tema, refaz com instrução reforçada
    let planned: any = null;
    let lastErr = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const reinforced = attempt === 0
        ? ""
        : `\n\nATENÇÃO: A tentativa anterior gerou um caso fora do tema. RELEIA os objetivos e gere um caso que cite EXPLICITAMENTE os termos clínicos dos objetivos no title, case_summary, comorbidades da vítima e na profissão do réu.`;
      const r = await callJson({
        system: ROOT_RULES,
        user: buildBlueprintPrompt(objectives, job.case_number || "001/2026", job.pdf_content || "") + reinforced,
        tool: BLUEPRINT_TOOL,
        model: "google/gemini-2.5-pro",
        maxTokens: 5000,
        timeoutMs: 120_000,
      });
      if (!r.ok) { lastErr = r.error; continue; }

      // Validação de aderência: pelo menos 1 termo significativo dos objetivos deve aparecer no title+summary
      const haystack = `${r.data.title || ""} ${r.data.case_summary || ""} ${r.data?.victim?.comorbidities || ""} ${r.data?.defendant?.profession || ""}`.toLowerCase();
      const stop = new Set(["de","da","do","das","dos","em","no","na","para","com","e","o","a","os","as","um","uma","ao","à","avaliação","tratamento","segurança","efetividade","uso","sobre","pelo","pela"]);
      const keywords = (objectives.toLowerCase().match(/[a-záéíóúâêôãõç]{4,}/gi) || [])
        .filter((w: string) => !stop.has(w));
      const hits = keywords.filter((k: string) => haystack.includes(k));
      const ratio = keywords.length ? hits.length / keywords.length : 1;
      if (!objectives || ratio >= 0.25 || hits.length >= 2) {
        planned = r.data;
        break;
      }
      lastErr = `Blueprint fora do tema (apenas ${hits.length}/${keywords.length} termos: title="${r.data.title}")`;
      console.log("blueprint mismatch, retrying:", lastErr);
    }

    if (!planned) {
      planned = buildDeterministicBlueprint(job);
      const total = 4 + (planned.planned_annexes || []).length + 1 + 1;
      await updateJob(jobId, {
        blueprint_json: planned,
        total_steps: total,
        completed_steps: 1,
        progress: Math.round((1 / total) * 100),
        current_step: "Planejamento de contingência aplicado — gerando seções",
        status: "generating_section",
        validation_issues: [...(job.validation_issues || []), ...(lastErr ? [lastErr, "Planejamento por IA fora do tema; usando estrutura de contingência ancorada nos objetivos."] : ["Planejamento por IA fora do tema; usando estrutura de contingência ancorada nos objetivos."])],
        last_error: lastErr || null,
      });
      return { done: false };
    }

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
  const persisted = await persistGeneratedCase(jobId, job, {
    title: bp.title,
    processContent,
    characters: sec.characters || [],
    imageAttachments: bp.planned_image_attachments || [],
  });

  if (!persisted.ok) {
    await updateJob(jobId, {
      status: "failed",
      last_error: persisted.error,
      current_step: "Falha ao salvar processo",
      finished_at: new Date().toISOString(),
    });
    return { done: true, failed: true };
  }

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
