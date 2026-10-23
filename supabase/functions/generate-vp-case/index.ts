import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAiWithFallback } from "../_shared/ai-caller.ts";
import { adminClient, getUserId, unauthorized } from "../_shared/auth-guard.ts";
import {
  VERSAO_KEYS,
  buildPatientPrompt,
  isCaseDataV2,
  validateCaseData,
  type Nucleo,
  type Versao,
  type VersaoKey,
  type VpCaseData,
} from "../_shared/vp-case-schema.ts";

// Gerador de casos no esquema v2 (P25). Roda em etapas separadas para não estourar o tempo de uma única chamada:
//   nucleo  → cria o rascunho com o núcleo clínico (verdade única do caso);
//   versao  → acrescenta a versão de UMA profissão (cenário, revelação, encontros, gabarito);
//   auditar → confere a consistência do caso inteiro e devolve a lista de problemas.
// O caso sempre nasce como rascunho: o docente revisa no editor e publica.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-2.5-pro";

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ───────────────────────── schemas das ferramentas ─────────────────────────

const S = (description?: string) => ({ type: "string", ...(description ? { description } : {}) });
const INT = { type: "integer" };
const NUM = { type: "number" };
const arr = (items: unknown) => ({ type: "array", items });
const obj = (properties: Record<string, unknown>, required: string[] = Object.keys(properties)) => ({ type: "object", properties, required });

// O sistema usa estas categorias para ligar cada fato à dimensão da anamnese na correção (cobertura por área).
const FATO_CATEGORIAS = [
  "queixa e sintomas",
  "medicamentos",
  "adesao",
  "automedicacao e fitoterapicos",
  "habitos de vida",
  "contexto social",
  "antecedentes",
];

const NUCLEO_TOOL = {
  type: "function" as const,
  function: {
    name: "create_nucleo",
    description: "Registra o núcleo clínico do caso.",
    parameters: obj({
      descricao: S("Condição do paciente em 1 linha. Ex.: 'Polifarmácia em idosa com Alzheimer'."),
      nucleo: obj({
        identidade: obj({
          nome: S(), idade: INT, sexo: S(), ocupacao: S(), estado_civil: S(), escolaridade: S(), moradia: S(),
          peso_kg: NUM, altura_m: NUM, alergias: S(), habitos: S(), historico_familiar: S(),
        }, ["nome", "idade", "sexo", "ocupacao", "alergias"]),
        temperamento: S(), modo_de_falar: S(), letramento_saude: S(), como_se_sente: S(),
        fatos: arr(obj({ id: S("I1, I2, ..."), categoria: { type: "string", enum: FATO_CATEGORIAS }, conteudo: S() })),
        medicamentos: arr(obj({
          como_chama: S(), prescrito: S(), uso_real: S(), acha_que_serve: S(), observacao_clinica: S(),
        }, ["como_chama", "prescrito", "uso_real", "acha_que_serve"])),
        achados: arr(obj({
          id: S("A1, A2, ..."),
          tipo: { type: "string", enum: ["documento", "parametro_clinico", "sinal_vital", "exame_fisico"] },
          titulo: S(), conteudo: S(),
        })),
        exames: arr(obj({ nome: S(), resultado: S(), referencia: S() }, ["nome", "resultado"])),
        vitais_baseline: obj({
          PA: S("Ex.: '138/82'"), FC: INT, FR: INT, Temp: NUM, SatO2: INT, Glicemia: { type: ["integer", "null"] },
        }, ["PA", "FC", "FR", "Temp", "SatO2"]),
        contexto_vitais: S("1-2 frases: medicamentos em uso e fatores que afetam os vitais."),
      }),
    }),
  },
};

const ENCONTRO = obj({
  numero: { type: "integer", enum: [1, 2, 3] },
  tipo: { type: "string", enum: ["anamnese", "discussao_prescritor", "retorno", "orientacao", "passagem_caso"] },
  interlocutor: { type: "string", enum: ["paciente", "cuidador", "prescritor", "equipe"] },
  cartao: obj({ cenario: S(), tarefa: S(), tempo_min: INT }, ["cenario", "tarefa"]),
  persona_interlocutor: obj({
    nome: S(), perfil: S(), temperamento: S(), resistencias: arr(S()), criterios_para_ceder: arr(S()),
  }),
  evolucao: arr(obj({ quando: S(), paciente_relata: S() })),
  evolucao_sem_mudanca: S(),
}, ["numero", "tipo", "interlocutor", "cartao"]);

const VERSAO_TOOL = {
  type: "function" as const,
  function: {
    name: "create_versao",
    description: "Registra a versão do caso para uma profissão.",
    parameters: obj({
      versao: obj({
        cenario: obj({ local: S(), tratamento: S(), motivo_da_vinda: S(), abertura: S() }),
        revelacao: arr(obj({
          id: S("id de um fato do núcleo"),
          nivel: { type: "string", enum: ["espontanea", "pergunta_aberta", "direta", "vinculo"] },
          quando: S(), fala: S(),
        })),
        gatilhos_achados: arr(obj({ achado: S("id de um achado do núcleo"), quando: S() })),
        perguntas_do_paciente: arr(S()),
        fora_do_roteiro: arr(S()),
        dicas_de_atuacao: arr(S()),
        encontros: arr(ENCONTRO),
        gabarito: obj({
          problemas_esperados: arr(obj({ problema: S(), tipo: S(), justificativa: S() })),
          red_flags: arr(obj({ sinal: S(), conduta_esperada: S() })),
          informacoes_alvo: arr(obj({
            id_informacao: S("id de um fato do núcleo"), descricao: S(),
            importancia: { type: "string", enum: ["Essencial", "Importante", "Complementar"] },
          })),
          conduta_esperada: arr(S()),
          orientacoes_esperadas: arr(S()),
          encaminhamentos: arr(S()),
          objetivos_aprendizagem: arr(S()),
          referencias: arr(S()),
        }),
      }),
    }),
  },
};

const AUDIT_TOOL = {
  type: "function" as const,
  function: {
    name: "report_audit",
    description: "Registra os problemas de consistência encontrados no caso.",
    parameters: obj({
      resumo: S("Uma frase com a avaliação geral do caso."),
      problemas: arr(obj({
        gravidade: { type: "string", enum: ["alta", "media", "baixa"] },
        onde: S("Onde está o problema (ex.: 'núcleo · medicamentos', '[farmaceutico] gabarito')."),
        descricao: S(),
        sugestao: S(),
      })),
    }),
  },
};

// ───────────────────────── prompts ─────────────────────────

// As aulas dos módulos Dor e Inflamação são sobre o TRATAMENTO da dor e da inflamação. Outras condições entram só
// como contexto ou comorbidade que muda a escolha, a dose ou a segurança dessa terapia.
const FOCO_DOR = `FOCO EDUCACIONAL OBRIGATÓRIO: este caso é de um módulo sobre TRATAMENTO DA DOR E DA INFLAMAÇÃO. Os problemas esperados, as condutas, as orientações, os objetivos de aprendizagem e a evolução devem girar em torno da ESCOLHA, DOSE, SEGURANÇA, INTERAÇÕES e MONITORIZAÇÃO da terapia analgésica e anti-inflamatória (analgésicos simples, AINE, opioides, corticoides, adjuvantes, terapias tópicas e medidas não farmacológicas). A doença de base e as comorbidades entram só como contexto que modifica essa escolha; terapias de outra finalidade (por exemplo, hipouricemiante ou controle glicêmico) aparecem como contexto e não como foco do gabarito.`;

const isFocoDor = (category: string) => /^(dor|inflama)/i.test(category.trim());

const SYSTEM_NUCLEO = `Você é um especialista em educação clínica e em pacientes simulados (OSCE). Você cria o NÚCLEO CLÍNICO de um caso: tudo o que é verdade sobre o paciente, independentemente da profissão que o atenderá.

REGRAS:
- Pessoa brasileira realista, com contexto do SUS, UBS, farmácia comunitária ou ambulatório.
- fatos: de 8 a 12, com ids I1, I2, ... únicos. A categoria é SEMPRE uma de: ${FATO_CATEGORIAS.join(", ")} (o sistema usa essas categorias para avaliar a anamnese). Cada fato é UMA informação verificável, em terceira pessoa, sem repetir outro fato.
- Embuta de 3 a 5 problemas clínicos reais nos fatos e nos medicamentos (interação, dose inadequada, uso incorreto, automedicação, duplicidade, má adesão), coerentes com o contexto pedido, que um bom profissional descobre perguntando. Nem óbvios demais, nem impossíveis de descobrir.
- medicamentos: 'prescrito' é como consta na receita; 'uso_real' é como a pessoa realmente usa; a diferença entre os dois é onde moram os problemas. 'observacao_clinica' é o comentário clínico que NÃO é dito ao aluno.
- Doses, sinais vitais e exames reais e coerentes entre si e com a condição (por exemplo, função renal e doses; pressão e anti-hipertensivos).
- achados: documentos e dados que só aparecem se o aluno pedir (receita, caixa do medicamento, resultado de exame), com ids A1, A2, ... exames: resultados FIXOS. Achados do tipo exame_fisico só podem trazer o que um farmacêutico, um enfermeiro e um médico conseguem fazer em consulta ambulatorial básica: inspeção (pele, unhas, boca, mãos, edema), aferições (sinais vitais, peso, glicemia capilar) e palpação superficial. NUNCA crie toque retal, palpação abdominal profunda, exame ginecológico, ausculta detalhada ou exame neurológico minucioso. Sintomas como fezes escuras, dor abdominal ou urina alterada entram só pelo RELATO do paciente (fatos) ou por exame laboratorial (achados tipo exame), nunca como exame físico.
- temperamento, modo_de_falar e letramento_saude: curtos e concretos (como a pessoa fala, vocabulário, hábitos).
- Se quem conta a história for um CUIDADOR: 'identidade' descreve o CUIDADOR (quem fala com o aluno: nome, idade, ocupação) e TODOS os dados clínicos (alergias, medicamentos, vitais, exames, histórico) são do PACIENTE, que é nomeado e descrito nos fatos (ex.: 'Dona Lurdes (78 anos) tem...'). temperamento, modo_de_falar e como_se_sente são do cuidador.
- Não escreva diálogos nem condutas esperadas aqui: só a verdade do caso.
- Original: não copie casos conhecidos.`;

interface Perfil {
  rotulo: string;
  papel: string;
  tratamento: string;
  encontros: string;
  gabarito: string;
}

const PERFIS: Record<VersaoKey, Perfil> = {
  farmaceutico: {
    rotulo: "Farmácia",
    papel: "O aluno é FARMACÊUTICO e NÃO prescreve. Ele revisa a farmacoterapia, identifica e resolve problemas relacionados a medicamentos (PRM), orienta, monitora, propõe ajuste AO PRESCRITOR, encaminha e indica apenas medicamentos isentos de prescrição ou por protocolo.",
    tratamento: "Como a pessoa chama o aluno no balcão ou no consultório (ex.: 'moço(a)', 'doutor(a)', 'farmacêutico(a)').",
    encontros: "1) anamnese e revisão da farmacoterapia (interlocutor: o paciente ou o cuidador); 2) discussao_prescritor (interlocutor: prescritor, COM persona_interlocutor); 3) retorno (interlocutor: o paciente ou o cuidador) para acompanhamento e orientação.",
    gabarito: "Use linguagem de cuidado farmacêutico: PRM, adesão, interações, intervenção farmacêutica, orientação, monitorização. conduta_esperada NUNCA diz 'prescrever': diz propor ajuste ao prescritor, orientar, monitorar, encaminhar.",
  },
  enfermeiro: {
    rotulo: "Enfermagem",
    papel: "O aluno é ENFERMEIRO: consulta de enfermagem, levantamento de necessidades e diagnósticos de enfermagem, educação em saúde, administração segura e passagem de caso estruturada (SBAR) à equipe. Não prescreve medicamentos (salvo protocolo institucional).",
    tratamento: "Como a pessoa chama o aluno (ex.: 'enfermeiro(a)', 'moço(a)').",
    encontros: "1) consulta de enfermagem (anamnese; interlocutor: paciente ou cuidador); 2) passagem_caso em formato SBAR (interlocutor: equipe, COM persona_interlocutor, ex.: o médico ou enfermeiro responsável); 3) retorno (visita de retorno; interlocutor: paciente ou cuidador).",
    gabarito: "Use linguagem de enfermagem: necessidades afetadas, diagnósticos de enfermagem, intervenções, orientação, segurança do paciente, SBAR. conduta_esperada nunca diz 'prescrever medicamento'.",
  },
  medico: {
    rotulo: "Medicina",
    papel: "O aluno é MÉDICO: raciocínio diagnóstico, hipóteses, pedido de exames, conduta e prescrição.",
    tratamento: "Como a pessoa chama o aluno (ex.: 'doutor(a)').",
    encontros: "1) consulta (anamnese e exame; interlocutor: paciente ou cuidador); 2) passagem_caso de interconsulta ou resultado de exames (interlocutor: equipe, COM persona_interlocutor, ex.: especialista ou laboratório); 3) retorno com ajuste do plano (interlocutor: paciente ou cuidador).",
    gabarito: "Use linguagem médica: problemas e hipóteses diagnósticas (incluindo as que não podem ser perdidas), red flags, exames indicados, conduta e prescrição, seguimento.",
  },
};

function systemVersao(key: VersaoKey): string {
  const p = PERFIS[key];
  return `Você é um especialista em educação clínica e em pacientes simulados (OSCE). O núcleo clínico do caso JÁ EXISTE e é a única verdade: você NÃO muda nem acrescenta fatos. Você escreve só a VERSÃO PARA ${p.rotulo.toUpperCase()}: o que muda com a profissão.

PAPEL DO ALUNO: ${p.papel}

REGRAS:
- cenario.local: local de atendimento adequado à profissão. cenario.tratamento: ${p.tratamento} cenario.motivo_da_vinda: por que a pessoa veio. cenario.abertura: UMA frase curta e vaga, sem nenhuma informação clínica.
- Coerência de presença: se o caso é contado por um CUIDADOR, deixe explícito no cenário e na abertura do encontro 1 se o paciente está PRESENTE (ex.: 'a filha chega com o pai na cadeira de rodas'). Achados de exame físico e sinais vitais do paciente só existem se ele estiver presente; se não estiver, não crie achado de exame físico acessível no encontro 1. A abertura nunca contradiz os achados.
- revelacao: exatamente UMA entrada para CADA fato do núcleo (todos os ids, sem faltar nenhum). Níveis: espontanea (no máximo 2 fatos no caso inteiro), pergunta_aberta, direta e vinculo (ao menos 1 fato). Detalhes de medicamentos costumam ser 'direta'; temas delicados (uso incorreto, culpa, dinheiro) costumam ser 'vinculo'. 'quando' descreve o gatilho concreto. 'fala' é o que a pessoa diz, em linguagem natural e AUTO-SUFICIENTE (faz sentido sozinha, com contexto de quando e onde aconteceu), sem ids nem nomes de categoria.
- gatilhos_achados: uma entrada para CADA achado do núcleo, dizendo quando ele só deve aparecer. O gatilho de um exame físico só pode pedir inspeção, aferições ou palpação superficial compatíveis com o papel do aluno (nunca toque retal nem palpação abdominal profunda).
- perguntas_do_paciente (2 a 4), fora_do_roteiro (2 a 4) e dicas_de_atuacao (3 a 5, sobre como atuar, sem entregar respostas).
- encontros: exatamente 3 (numero 1, 2, 3): ${p.encontros}
  • cartao.cenario: onde o aluno está e o que aconteceu desde o último encontro. cartao.tarefa: o que fazer, SEM lista de passos e SEM dizer o que perguntar. O cartão não revela nome nem idade de quem fala, nem achados. tempo_min: 15, 10 e 10.
  • Encontro com prescritor ou equipe: persona_interlocutor completa (nome, perfil, temperamento, 2 a 4 resistencias, 2 a 4 criterios_para_ceder). A persona só conhece o prontuário, nunca o que o paciente contou.
  • Encontro 3: 'evolucao' com 3 a 5 ramos que dependem do que o prescritor ou a equipe ACEITOU no encontro 2 (ex.: 'se o prescritor aceitou reduzir a dose X'), mais 'evolucao_sem_mudanca' (se nada foi aceito). Nunca condicione a evolução ao que o aluno apenas sugeriu. Os campos 'evolucao' e 'evolucao_sem_mudanca' existem SOMENTE no encontro 3: deixe-os FORA dos encontros 1 e 2 (no encontro 1 ainda não houve nada a evoluir).
- gabarito: problemas_esperados (com tipo e justificativa), red_flags com conduta esperada, informacoes_alvo (ids de fatos do núcleo que o aluno deveria obter, com importância Essencial, Importante ou Complementar; cubra todos os fatos relevantes), conduta_esperada, orientacoes_esperadas, encaminhamentos, objetivos_aprendizagem e referencias. ${p.gabarito}
- referencias: cite SOMENTE diretrizes, protocolos ou critérios que existem de fato e que você conhece bem (sem links). Se não tiver certeza, deixe a lista curta.`;
}

const SYSTEM_AUDIT = `Você é um revisor clínico rigoroso de casos de pacientes simulados. Recebe um caso completo (núcleo clínico e versões por profissão) e procura problemas de CONSISTÊNCIA. Seja específico e não invente problemas: se algo está correto, não liste.

Confira:
1. Núcleo: doses, vitais, exames e medicamentos coerentes entre si e com a condição (função renal x doses, pressão x anti-hipertensivos, interações reais). Fatos que contradizem a tabela de medicamentos (prescrito x uso_real).
2. Nomes: se o caso tem cuidador, os dados clínicos são do paciente e a identidade é do cuidador; sem troca de nomes, idades ou relações em nenhum texto.
3. Cada versão: a 'fala' de cada revelação diz exatamente o fato correspondente (nem mais, nem menos, nem contradiz); não vaza informação de outros fatos nem rótulos de categoria.
4. Gabarito: problemas, red flags e condutas apoiados nos fatos do núcleo; condutas dentro do escopo da profissão (em Farmácia, nada de 'prescrever': propor ajuste ao prescritor, orientar, monitorar, encaminhar).
5. Encontros: cartões sem lista de passos e sem revelar achados; persona do prescritor ou da equipe coerente com os fatos; evolução do encontro 3 condicionada ao que o prescritor ACEITOU.
6. Referências: aponte qualquer referência que pareça inexistente ou imprecisa.

Gravidade: alta = erro clínico ou contradição que enganaria o aluno; media = inconsistência que afeta a correção; baixa = melhoria de redação.`;

// ───────────────────────── chamada de IA ─────────────────────────

async function callTool(system: string, user: string, tool: { function: { name: string } }, temperature: number): Promise<any> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { response } = await callAiWithFallback({
      model: MODEL,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: tool.function.name } },
    });
    if (!response.ok) {
      const t = await response.text();
      console.error(`AI error (attempt ${attempt}):`, response.status, t.slice(0, 500));
      if (response.status === 429) throw new HttpError(429, "Limite de requisições excedido. Tente novamente em alguns minutos.");
      if (response.status === 402) throw new HttpError(402, "Créditos insuficientes na sua workspace Lovable AI.");
      continue;
    }
    const data = await response.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (args) {
      try { return typeof args === "string" ? JSON.parse(args) : args; } catch { /* tenta de novo */ }
    }
    console.error(`Sem tool call válido (attempt ${attempt}):`, JSON.stringify(data).slice(0, 400));
  }
  throw new HttpError(500, "A IA não devolveu uma estrutura válida. Tente novamente.");
}

// ───────────────────────── validação e resumo ─────────────────────────

function nucleoErrors(nucleo: Nucleo): string[] {
  const probe = { schema_version: 2, nucleo, versoes: {} } as unknown as VpCaseData;
  return validateCaseData(probe).filter((e) => e !== "nenhuma versão por profissão");
}

// A evolução do paciente conforme o que o prescritor aceitou pertence ao retorno (encontro 3). Mesmo que a IA a
// escreva em outro encontro, o código remove: no encontro 1 ela induziria o paciente a "evoluir" antes de qualquer conduta.
function limparVersao(v: Versao): Versao {
  for (const e of v.encontros || []) {
    if (e.numero !== 3) {
      delete e.evolucao;
      delete e.evolucao_sem_mudanca;
    }
  }
  return v;
}

function versaoErrors(d: VpCaseData, key: VersaoKey): string[] {
  return validateCaseData(d).filter((e) => e.startsWith(`[${key}]`) || e.startsWith("núcleo") || e.startsWith("id de") || e.startsWith("vitais"));
}

// Alimenta o que ainda lê o formato antigo (listagens e a tela de análise do docente).
function resumoClinico(d: VpCaseData, key: VersaoKey, category: string, descricao: string) {
  const n = d.nucleo;
  const v = d.versoes[key]!;
  const vb = n.vitais_baseline;
  return {
    name: n.identidade.nome,
    age: n.identidade.idade,
    profession: n.identidade.ocupacao,
    module: category,
    description: descricao,
    expectation: n.como_se_sente,
    history: n.fatos.slice(0, 6).map((f) => f.conteudo),
    medications: n.medicamentos.map((m) => m.prescrito),
    vitals: `PA ${vb.PA} mmHg | FC ${vb.FC} bpm | Temp ${String(vb.Temp).replace(".", ",")} °C`,
    physicalExam: n.achados.filter((a) => a.tipo === "exame_fisico").map((a) => a.conteudo).join("; "),
    behaviors: [n.temperamento, n.modo_de_falar, n.letramento_saude].filter(Boolean),
    learningFocus: v.gabarito?.objetivos_aprendizagem || [],
  };
}

async function loadOwnedCase(admin: ReturnType<typeof adminClient>, id: string, userId: string) {
  const { data, error } = await admin
    .from("custom_virtual_patients")
    .select("id, user_id, category, description, case_data")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) throw new HttpError(404, "Caso não encontrado.");
  if (data.user_id !== userId) throw new HttpError(403, "Este caso não é seu.");
  if (!isCaseDataV2(data.case_data)) throw new HttpError(400, "O caso não está no esquema v2.");
  return data as { id: string; user_id: string; category: string; description: string; case_data: VpCaseData };
}

// ───────────────────────── ações ─────────────────────────

async function acaoNucleo(body: any, userId: string) {
  const category = String(body.category || "").trim();
  const contexto = String(body.clinical_context || "").trim();
  const quem = body.quem_conta === "cuidador" ? "cuidador" : "paciente";
  if (!category || !contexto) throw new HttpError(400, "category e clinical_context são obrigatórios");

  const userPrompt = `CATEGORIA: ${category}
CONTEXTO CLÍNICO INFORMADO PELO DOCENTE: ${contexto}
QUEM CONTA A HISTÓRIA AO ALUNO: ${quem === "cuidador" ? "um CUIDADOR (o paciente não consegue contar sozinho)" : "o próprio PACIENTE"}

${isFocoDor(category) ? FOCO_DOR + "\n\n" : ""}Crie o núcleo clínico com a ferramenta create_nucleo.`;

  let out = await callTool(SYSTEM_NUCLEO, userPrompt, NUCLEO_TOOL, 0.8);
  let errs = out?.nucleo ? nucleoErrors(out.nucleo) : ["sem núcleo"];
  if (errs.length > 0) {
    // Uma tentativa de correção, mostrando os problemas encontrados.
    out = await callTool(SYSTEM_NUCLEO, `${userPrompt}\n\nA tentativa anterior teve estes problemas. Corrija todos:\n- ${errs.join("\n- ")}`, NUCLEO_TOOL, 0.6);
    errs = out?.nucleo ? nucleoErrors(out.nucleo) : ["sem núcleo"];
  }
  if (!out?.nucleo) throw new HttpError(500, "A IA não devolveu o núcleo do caso. Tente novamente.");

  const nucleo = out.nucleo as Nucleo;
  const caseData: VpCaseData = { schema_version: 2, nucleo, versoes: {} };
  const admin = adminClient();
  const { data: inserted, error } = await admin
    .from("custom_virtual_patients")
    .insert({
      user_id: userId,
      category,
      name: nucleo.identidade.nome,
      age: nucleo.identidade.idade,
      profession: nucleo.identidade.ocupacao,
      description: String(out.descricao || category),
      clinical_context: contexto,
      system_prompt: "",
      baseline_vitals: nucleo.vitais_baseline,
      baseline_context: nucleo.contexto_vitais,
      clinical_case: {},
      case_data: caseData,
      schema_version: 2,
      status: "draft",
    })
    .select("id, name, category")
    .single();
  if (error || !inserted) {
    console.error("DB error:", error);
    throw new HttpError(500, error?.message || "Não foi possível salvar o caso.");
  }
  return { id: inserted.id, name: inserted.name, category: inserted.category, avisos: errs };
}

async function acaoVersao(body: any, userId: string) {
  const key = body.profession as VersaoKey;
  if (!VERSAO_KEYS.includes(key)) throw new HttpError(400, "profession inválida");
  const admin = adminClient();
  const row = await loadOwnedCase(admin, String(body.id || ""), userId);
  const d = row.case_data;
  // Não sobrescreve uma versão que já existe (o docente pode ter revisado e editado): só com pedido explícito.
  if (d.versoes?.[key] && body.substituir !== true) throw new HttpError(409, "Este caso já tem essa versão.");

  const userPrompt = `NÚCLEO CLÍNICO DO CASO (única verdade; não altere):
${JSON.stringify(d.nucleo, null, 1)}

${isFocoDor(row.category) ? FOCO_DOR + "\n\n" : ""}Escreva a versão para ${PERFIS[key].rotulo} com a ferramenta create_versao.`;

  let out = await callTool(systemVersao(key), userPrompt, VERSAO_TOOL, 0.6);
  if (out?.versao) limparVersao(out.versao);
  let draft: VpCaseData = { ...d, versoes: { ...d.versoes, [key]: out?.versao as Versao } };
  let errs = out?.versao ? versaoErrors(draft, key) : ["sem versão"];
  if (errs.length > 0) {
    // Uma tentativa de correção automática, com a lista de problemas do validador.
    out = await callTool(
      systemVersao(key),
      `${userPrompt}\n\nA tentativa anterior foi reprovada pelo validador. Reescreva a versão corrigindo TODOS os problemas:\n- ${errs.join("\n- ")}`,
      VERSAO_TOOL,
      0.4,
    );
    if (out?.versao) limparVersao(out.versao);
    draft = { ...d, versoes: { ...d.versoes, [key]: out?.versao as Versao } };
    errs = out?.versao ? versaoErrors(draft, key) : ["sem versão"];
  }
  if (!out?.versao) throw new HttpError(500, "A IA não devolveu a versão. Tente novamente.");

  // salvar === false: devolve a versão sem gravar. O editor a coloca no rascunho para o docente revisar e salvar
  // (assim um caso já publicado nunca muda sem revisão).
  if (body.salvar === false) return { id: row.id, profession: key, errors: errs, versao: out.versao };

  // Salva mesmo com pendências: é rascunho e o editor mostra o que falta.
  const update: Record<string, unknown> = { case_data: draft };
  const first = Object.keys(d.versoes).length === 0;
  if (first) {
    update.system_prompt = buildPatientPrompt(draft, key);
    update.clinical_case = resumoClinico(draft, key, row.category, row.description);
  }
  const { error } = await admin.from("custom_virtual_patients").update(update).eq("id", row.id);
  if (error) {
    console.error("DB error:", error);
    throw new HttpError(500, error.message);
  }
  return { id: row.id, profession: key, errors: errs };
}

async function acaoAuditar(body: any, userId: string) {
  const row = await loadOwnedCase(adminClient(), String(body.id || ""), userId);
  // A revisão anterior fica fora do que o revisor lê, para não contaminar a nova análise.
  const { revisao: _anterior, ...casoSemRevisao } = row.case_data as Record<string, unknown>;
  const out = await callTool(
    SYSTEM_AUDIT,
    `CASO COMPLETO:\n${JSON.stringify(casoSemRevisao)}\n\nRegistre os problemas com a ferramenta report_audit.`,
    AUDIT_TOOL,
    0.1,
  );
  const problemas = Array.isArray(out?.problemas) ? out.problemas : [];
  const resumo = String(out?.resumo || "");

  // Salva a revisão dentro do caso para o docente consultá-la e marcar o que já corrigiu no editor.
  // A revisão antiga é substituída; o conteúdo clínico do caso não é tocado.
  const revisao = {
    gerada_em: new Date().toISOString(),
    resumo,
    problemas: problemas.map((p: any) => ({
      gravidade: p.gravidade === "alta" || p.gravidade === "baixa" ? p.gravidade : "media",
      onde: String(p.onde || ""),
      descricao: String(p.descricao || ""),
      sugestao: p.sugestao ? String(p.sugestao) : undefined,
      resolvido: false,
    })),
  };
  const { error } = await adminClient()
    .from("custom_virtual_patients")
    .update({ case_data: { ...(row.case_data as Record<string, unknown>), revisao } })
    .eq("id", row.id);
  if (error) console.error("Não foi possível salvar a revisão no caso:", error);

  return { resumo, problemas, revisao_salva: !error };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = await getUserId(req);
    if (!userId) return unauthorized(corsHeaders);

    const body = await req.json();
    switch (body.action) {
      case "nucleo": return reply(await acaoNucleo(body, userId));
      case "versao": return reply(await acaoVersao(body, userId));
      case "auditar": return reply(await acaoAuditar(body, userId));
      default: return reply({ error: "action inválida" }, 400);
    }
  } catch (e) {
    if (e instanceof HttpError) return reply({ error: e.message }, e.status);
    console.error("generate-vp-case error:", e);
    return reply({ error: (e as Error).message }, 500);
  }
});
