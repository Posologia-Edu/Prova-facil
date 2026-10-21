import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-caller.ts";
import { adminClient, getUserId, forbidden } from "../_shared/auth-guard.ts";
import { loadVpCase } from "../_shared/vp-cases.ts";
import { ANAMNESE_KEYS, FICHA_KEYS, MAI_KEYS, baseScores } from "../_shared/vp-grade.ts";
import {
  buildGabaritoText,
  coberturaInformacoes,
  coberturaPorDimensao,
  isCaseDataV2,
  resolveVersaoKey,
  type Gabarito,
  type VpCaseData,
} from "../_shared/vp-case-schema.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Versão da rubrica gravada em cada nota. Incrementar sempre que pesos, dimensões ou
// penalidades mudarem, para que notas antigas e novas possam ser distinguidas.
const RUBRIC_VERSION = "vp-2026-10-a";
// Casos v2 (P20): anamnese 4 + MAI 4 + ficha 2; âncoras de nota; dimensões de conteúdo ligadas à cobertura calculada.
const RUBRIC_VERSION_FICHA = "vp-2026-10-c";
// Peso da cobertura calculada na nota das dimensões de conteúdo (o resto é o julgamento da IA).
const COBERTURA_PESO = 0.5;
const GRADING_MODEL = "google/gemini-2.5-pro";
const MAX_ATTEMPTS = 2;


const MAX_BONUS = 0.5;
const MAX_PENALTY = 1.5;

const GRADING_TOOL = {
  type: "function",
  function: {
    name: "submit_grading",
    description: "Registra as subnotas, evidências, bônus/penalidades e feedback da correção. O servidor calcula as notas totais.",
    parameters: {
      type: "object",
      properties: {
        subscores: {
          type: "object",
          description: "Cada dimensão de 0 a 1, com casas decimais.",
          properties: Object.fromEntries([...ANAMNESE_KEYS, ...MAI_KEYS].map((k) => [k, { type: "number" }])),
          required: [...ANAMNESE_KEYS, ...MAI_KEYS],
        },
        evidencias: {
          type: "object",
          properties: {
            anamnese: { type: "array", items: { type: "string" }, description: "Bullets com citação curta da conversa." },
            mai: { type: "array", items: { type: "string" }, description: "Bullets com citação ou observação sobre o MAI." },
          },
          required: ["anamnese", "mai"],
        },
        bonus_penalidades: {
          type: "object",
          description: "Valores SEMPRE positivos (magnitude). O servidor soma o bônus e subtrai as penalidades.",
          properties: {
            comunicacao_empatica_bonus: { type: "number", description: "0 a 0,5" },
            erro_seguranca_penalidade: { type: "number" },
            ignorou_alergia_penalidade: { type: "number" },
          },
          required: ["comunicacao_empatica_bonus", "erro_seguranca_penalidade", "ignorou_alergia_penalidade"],
        },
        feedback_resumido: {
          type: "string",
          description: "STRING única em markdown com 5 a 7 bullets iniciados por '- ' separados por \\n. Cada bullet com 1-2 frases completas em 2ª pessoa ('Você...'), citando aspectos específicos da anamnese, comunicação, raciocínio clínico e MAI. Mínimo 600 caracteres.",
        },
        orientacoes_melhoria: {
          type: "string",
          description: "STRING única em markdown com 5 a 8 bullets iniciados por '- ' separados por \\n. Cada bullet com uma orientação concreta e acionável em 2ª pessoa ('Você deve...'), referenciando o caso específico. Mínimo 800 caracteres.",
        },
        flags_seguranca: { type: "array", items: { type: "string" }, description: "Problemas críticos identificados, ou lista vazia." },
      },
      required: ["subscores", "evidencias", "bonus_penalidades", "feedback_resumido", "orientacoes_melhoria", "flags_seguranca"],
    },
  },
};

// Com gabarito, a IA também informa quais informações alvo o aluno obteve (o servidor calcula a cobertura).
function withObtidas(tool: typeof GRADING_TOOL) {
  const t = JSON.parse(JSON.stringify(tool));
  t.function.parameters.properties.informacoes_obtidas = {
    type: "array",
    items: { type: "string" },
    description: "Ids das informações alvo que o estudante obteve do paciente.",
  };
  t.function.parameters.required.push("informacoes_obtidas");
  return t;
}

// Com ficha, a IA também pontua o registro clínico do aluno (3 dimensões de 0 a 1).
function withFicha(tool: typeof GRADING_TOOL) {
  const t = JSON.parse(JSON.stringify(tool));
  const p = t.function.parameters;
  for (const k of FICHA_KEYS) p.properties.subscores.properties[k] = { type: "number" };
  p.properties.subscores.required.push(...FICHA_KEYS);
  p.properties.evidencias.properties.ficha = {
    type: "array",
    items: { type: "string" },
    description: "Bullets sobre a ficha: o que foi bem registrado, o que foi anotado sem ter sido perguntado e o que foi coletado e não registrado.",
  };
  p.properties.evidencias.required.push("ficha");
  return t;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

// Aceita a resposta via tool call (preferido) ou JSON no texto (provedores sem tool calling).
function extractGrade(aiData: any): any | null {
  const msg = aiData?.choices?.[0]?.message;
  const args = msg?.tool_calls?.[0]?.function?.arguments;
  let parsed: any = null;
  if (args) {
    try { parsed = typeof args === "string" ? JSON.parse(args) : args; } catch { parsed = null; }
  }
  if (!parsed) {
    let content: string = msg?.content || "";
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) content = fenced[1].trim();
    const braces = content.match(/\{[\s\S]*\}/);
    try { parsed = braces ? JSON.parse(braces[0]) : null; } catch { parsed = null; }
  }
  return parsed && typeof parsed.subscores === "object" && parsed.subscores !== null ? parsed : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, class_virtual_patient_id } = await req.json();

    if (!session_id || !class_virtual_patient_id) {
      return new Response(JSON.stringify({ error: "Missing session_id or class_virtual_patient_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // AuthZ: signed-in caller, or an anonymous participant that references a real
    // session belonging to the given virtual patient assignment.
    const userId = await getUserId(req);
    if (!userId) {
      const { data: sess } = await adminClient()
        .from("virtual_patient_sessions")
        .select("id, class_virtual_patient_id")
        .eq("id", session_id)
        .maybeSingle();
      if (!sess || sess.class_virtual_patient_id !== class_virtual_patient_id) {
        return forbidden(corsHeaders);
      }
    }

    // Fetch ALL messages from the conversation (full transcript across encounters)
    const { data: messages, error: msgErr } = await supabase
      .from("virtual_patient_messages")
      .select("role, content, encounter, author_name")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });

    if (msgErr || !messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages found for session" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch MAI (may include multiple medications)
    const { data: maiData } = await supabase
      .from("virtual_patient_mai_scores")
      .select("mai_json, total_score")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch session/patient context
    const { data: sessionData } = await supabase
      .from("virtual_patient_sessions")
      .select("patient_id, module, current_encounter, status, student_name, student_email")
      .eq("id", session_id)
      .single();

    // Gabarito do caso (esquema v2): referência da correção e base da cobertura das informações alvo.
    let gabarito: Gabarito | null = null;
    let gabaritoText = "";
    let caseV2: VpCaseData | null = null;
    const caseRec = await loadVpCase(sessionData?.patient_id);
    if (caseRec && isCaseDataV2(caseRec.case_data)) {
      const { data: cvpRow } = await supabase
        .from("class_virtual_patients")
        .select("profession")
        .eq("id", class_virtual_patient_id)
        .maybeSingle();
      const cd = caseRec.case_data as VpCaseData;
      caseV2 = cd;
      let key = resolveVersaoKey((cvpRow as any)?.profession);
      if (!cd.versoes[key]) key = Object.keys(cd.versoes)[0] as typeof key;
      gabarito = cd.versoes[key]?.gabarito ?? null;
      if (gabarito) gabaritoText = buildGabaritoText(cd, key);
    }

    // Ficha eletrônica (P20): só existe nos casos v2. Fica na sessão primária, a mesma do chat.
    const fichaEnabled = !!(caseRec && isCaseDataV2(caseRec.case_data));
    let fichaText = "";
    let fichaHasContent = false;
    if (fichaEnabled) {
      const { data: sections } = await supabase
        .from("virtual_patient_record_sections")
        .select("encounter, section_key, content")
        .eq("session_id", session_id)
        .order("encounter", { ascending: true });
      const titles: Record<number, string> = { 1: "Ficha de anamnese", 2: "Comunicação ao prescritor (SBAR)", 3: "Evolução (SOAP)" };
      const byEnc: Record<number, string[]> = {};
      for (const r of (sections || []) as any[]) {
        const txt = String(r.content || "").trim();
        if (!txt) continue;
        fichaHasContent = true;
        (byEnc[r.encounter] ||= []).push(`- ${String(r.section_key).replace(/_/g, " ")}: ${txt}`);
      }
      for (const enc of [1, 2, 3]) {
        fichaText += `\n--- ENCONTRO ${enc} · ${titles[enc]} ---\n${(byEnc[enc] || ["(não preenchida)"]).join("\n")}\n`;
      }
    }

    // Build full transcript (organized by encounter for clarity)
    const byEncounter: Record<number, typeof messages> = {};
    for (const m of messages) {
      const e = (m as any).encounter || 1;
      if (!byEncounter[e]) byEncounter[e] = [];
      byEncounter[e].push(m);
    }

    let transcript = "";
    for (const enc of Object.keys(byEncounter).sort()) {
      transcript += `\n=== ENCONTRO ${enc} ===\n`;
      for (const m of byEncounter[Number(enc)]) {
        const author = (m as any).author_name ? ` (${(m as any).author_name})` : "";
        const role = (m as any).role === "user" ? `ESTUDANTE${author}` : "PACIENTE";
        transcript += `${role}: ${(m as any).content}\n`;
      }
    }

    const maiSummary = maiData
      ? `MAI preenchido pelo estudante:\n${JSON.stringify(maiData.mai_json, null, 2)}\n(Score bruto: ${maiData.total_score})`
      : "MAI NÃO foi preenchido pelo estudante.";

    const systemPrompt = `Você é um AGENTE CORRETOR PROFISSIONAL de simulações clínicas com pacientes virtuais para a disciplina de Farmacologia Aplicada / Cuidado Farmacêutico.

Sua missão é avaliar OBJETIVAMENTE a interação completa do estudante com o paciente virtual, considerando duas grandes áreas de competência:

═══════════════════════════════════════════════
A) QUALIDADE DA ANAMNESE (peso ${fichaEnabled ? "40% — vale 4 pontos" : "60% — escala 0–6"})
═══════════════════════════════════════════════
Avalie 6 dimensões profissionais (cada uma 0–1, com casas decimais):

1. **identificacao_acolhimento** — Apresentação do estudante, cumprimento, postura empática, confirmação de identidade do paciente, comunicação acessível (sem jargão).
2. **queixa_principal_hda** — Caracterização da queixa principal e história da doença atual: localização, intensidade (escala de dor), qualidade, duração, fatores de melhora/piora, irradiação, sintomas associados.
3. **historia_medicamentosa** — Investigação ATIVA de TODOS os medicamentos em uso (prescritos, OTC, fitoterápicos, suplementos), dose, posologia, há quanto tempo, adesão, automedicação prévia.
4. **antecedentes_comorbidades** — Doenças crônicas, cirurgias, hospitalizações, alergias medicamentosas e alimentares, antecedentes familiares relevantes.
5. **habitos_estilo_vida** — Tabagismo, etilismo, atividade física, dieta, sono, ocupação, gestação/lactação quando aplicável.
6. **escuta_raciocinio_clinico** — Capacidade de fazer perguntas abertas, escuta ativa, reformulação, hipóteses farmacoterapêuticas coerentes, identificação de problemas relacionados a medicamentos (PRM/RNM).

═══════════════════════════════════════════════
B) QUALIDADE DO PREENCHIMENTO MAI (peso 40% — escala 0–4)
═══════════════════════════════════════════════
Avalie 4 dimensões do uso do Medication Appropriateness Index (cada uma 0–1):

1. **mai_completude** — Todos os medicamentos relevantes identificados na anamnese foram avaliados? Nenhum esquecido?
2. **mai_coerencia_clinica** — As classificações (apropriado / marginal / inapropriado) são coerentes com as evidências clínicas e o caso? (Ex.: AINE em paciente com DRC deve ser "inapropriado".)
3. **mai_justificativa_critica** — O estudante demonstra raciocínio crítico ao classificar (mesmo implícito na coerência das respostas dos 10 critérios MAI)?
4. **mai_seguranca_paciente** — Identificação correta de problemas de segurança: interações graves, contraindicações, duplicidades, doses inadequadas para idade/função renal/hepática.

${fichaEnabled ? `═══════════════════════════════════════════════
C) QUALIDADE DA FICHA (peso 20% — vale 2 pontos)
═══════════════════════════════════════════════
O estudante (ou o grupo) manteve uma ficha eletrônica: anamnese no 1º encontro, comunicação ao prescritor (SBAR) no 2º e evolução (SOAP) no 3º. Avalie 3 dimensões (cada uma 0–1), SEMPRE comparando a ficha com a conversa:

1. **ficha_completude** — O que foi coletado na conversa foi registrado? Há registro nos três encontros (anamnese, SBAR, SOAP)? As seções centrais estão preenchidas com informação útil?
2. **ficha_fidelidade** — O que está escrito corresponde ao que foi dito na conversa? Informação anotada que o paciente ou o prescritor NÃO disse (invenção, suposição tratada como fato) reduz esta nota; liste cada caso em evidencias.ficha.
3. **ficha_raciocinio** — A impressão/avaliação é coerente com os dados e o SBAR é claro e objetivo (situação, histórico, avaliação, recomendação)? O SOAP traz análise e plano compatíveis com o que aconteceu?

Se a ficha NÃO foi preenchida, atribua 0 às três dimensões e sinalize nas evidências.

` : ""}═══════════════════════════════════════════════
PENALIDADES CRÍTICAS DE SEGURANÇA (até 1,5 no total)
═══════════════════════════════════════════════
Liste em "flags_seguranca" e informe a magnitude (valor positivo) em bonus_penalidades:
- Recomendar/aceitar AINE em DRC, gestação avançada, úlcera ativa: 0,5 cada
- Não identificar interação grave (ex.: varfarina + AINE, IECA + AINE em idoso): 0,5 cada
- Opioide sem orientação de constipação/sedação: 0,3
- Ignorar alergia relatada: 0,5
- Não investigar gestação em mulher em idade fértil antes de prescrever: 0,3

BÔNUS: comunicacao_empatica_bonus de 0 a ${MAX_BONUS} para comunicação especialmente empática e clara.

═══════════════════════════════════════════════
REGRAS DE OUTPUT
═══════════════════════════════════════════════
- Responda chamando a função submit_grading. NÃO calcule notas totais: o sistema soma as subnotas, aplica bônus e penalidades e limita o resultado a 0–10.
- Em grupos, as falas do estudante vêm identificadas pelo nome de quem escreveu. Avalie a atuação do grupo como um todo.
- Cite EVIDÊNCIAS curtas do transcript ("o aluno perguntou: …" / "o aluno NÃO investigou …").
- Seja honesto: se a anamnese foi pobre, dê notas baixas.
- O tamanho da conversa NÃO deve influenciar a nota: avalie a cobertura e a qualidade, não a quantidade de mensagens.
- Se o MAI não foi preenchido, atribua 0 a todas as dimensões do MAI e sinalize nas evidências.${fichaEnabled ? "\n- Preencha também as dimensões da ficha (seção C) e evidencias.ficha. A ficha é um registro do estudante: não use o que está nela como prova de que a informação foi obtida do paciente; isso só vale se aparece na conversa." : ""}
- Se o texto de qualquer campo vier em formato de lista, use um único string em markdown com bullets.${gabarito ? `
- Preencha informacoes_obtidas com os ids (I1, I2…) das informações alvo que o estudante EFETIVAMENTE obteve do paciente na conversa. Não inclua um id se o paciente não revelou aquela informação.

ÂNCORAS DE NOTA (use a escala inteira de 0 a 1 nas dimensões da anamnese e da ficha):
- 0,0 = não fez; 0,25 = muito incompleto; 0,5 = metade do esperado, ou tudo porém superficial; 0,75 = a maior parte, com pequenas lacunas; 1,0 = completo e bem conduzido.
- historia_medicamentosa: 1,0 = investigou ativamente TODOS os medicamentos (prescritos, sem receita, fitoterápicos), com dose, horário, tempo de uso e adesão. Só os prescritos, com dose = 0,5. Nada específico = 0.
- Notas menores ou iguais a 0,3 só quando praticamente não houve investigação daquela dimensão.
- Seja coerente com informacoes_obtidas: se o estudante obteve a maior parte das informações de uma área, não dê nota muito baixa nela; se obteve poucas, não dê nota alta.

${gabaritoText}` : ""}`;

    const userContent = `[CONTEXTO DA SESSÃO]
Paciente virtual: ${sessionData?.patient_id || "?"}
Módulo: ${sessionData?.module || "?"}
Encontro atual: ${sessionData?.current_encounter || "?"}
Status: ${sessionData?.status || "?"}
Estudante: ${sessionData?.student_name || "—"} (${sessionData?.student_email || "—"})

[TRANSCRIPT COMPLETO DA INTERAÇÃO]
${transcript}

[MAI – MEDICATION APPROPRIATENESS INDEX]
${maiSummary}
${fichaEnabled ? `
[FICHA ELETRÔNICA DO ESTUDANTE]
${fichaText}
` : ""}
Avalie agora seguindo rigorosamente as regras do system prompt.`;

    // Correção com resposta estruturada, temperatura baixa e nova tentativa em caso de
    // falha ou resposta malformada (antes, um JSON inválido virava erro 500 sem retry).
    let gradeResult: any = null;
    let rawResponse = "";
    let lastError = "";
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !gradeResult; attempt++) {
      const { response } = await callAiWithFallback({
        model: GRADING_MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [gabarito ? withObtidas(fichaEnabled ? withFicha(GRADING_TOOL) : GRADING_TOOL) : (fichaEnabled ? withFicha(GRADING_TOOL) : GRADING_TOOL)],
        tool_choice: { type: "function", function: { name: "submit_grading" } },
      });

      if (!response.ok) {
        lastError = await response.text();
        console.error(`AI error (attempt ${attempt}):`, response.status, lastError);
        if (response.status === 402) break;
        continue;
      }

      const aiData = await response.json();
      rawResponse = JSON.stringify(aiData?.choices?.[0]?.message ?? aiData).slice(0, 20000);
      gradeResult = extractGrade(aiData);
      if (!gradeResult) {
        lastError = "Failed to parse AI grade response";
        console.error(`Failed to parse grade (attempt ${attempt}):`, rawResponse.slice(0, 2000));
      }
    }

    if (!gradeResult) {
      return new Response(JSON.stringify({ error: lastError ? `AI grading failed: ${lastError.slice(0, 400)}` : "AI grading failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Coerce array-shaped fields into markdown bullet strings (defensive normalization)
    const coerceToMarkdown = (val: any): string => {
      if (val == null) return "";
      if (Array.isArray(val)) return val.map((v) => `- ${String(v).trim()}`).join("\n");
      return String(val);
    };
    const feedbackResumido = coerceToMarkdown(gradeResult.feedback_resumido);
    let orientacoes = coerceToMarkdown(gradeResult.orientacoes_melhoria);
    if (gradeResult.evidencias) {
      const ev = gradeResult.evidencias;
      const evidLines: string[] = [];
      if (Array.isArray(ev.anamnese) && ev.anamnese.length) {
        evidLines.push("**Evidências — Anamnese:**");
        ev.anamnese.forEach((e: string) => evidLines.push(`- ${e}`));
      }
      if (Array.isArray(ev.mai) && ev.mai.length) {
        evidLines.push("\n**Evidências — MAI:**");
        ev.mai.forEach((e: string) => evidLines.push(`- ${e}`));
      }
      if (Array.isArray(ev.ficha) && ev.ficha.length) {
        evidLines.push("\n**Evidências — Ficha:**");
        ev.ficha.forEach((e: string) => evidLines.push(`- ${e}`));
      }
      if (evidLines.length) {
        orientacoes = `${orientacoes}\n\n${evidLines.join("\n")}`.trim();
      }
    }

    // ===== Cálculo da nota no servidor (a IA só devolve subnotas) =====
    const rawSubs = gradeResult.subscores || {};
    const subs: Record<string, number> = {};
    for (const k of [...ANAMNESE_KEYS, ...MAI_KEYS]) subs[k] = round2(clamp(num(rawSubs[k]), 0, 1));
    // Sem MAI enviado, a seção B é zerada independentemente do que o modelo devolver.
    if (!maiData) for (const k of MAI_KEYS) subs[k] = 0;
    // Com ficha, as três dimensões sempre são gravadas (mesmo zeradas): é isso que marca a nota como "com ficha".
    // Ficha vazia zera a seção independentemente do que o modelo devolver.
    if (fichaEnabled) {
      for (const k of FICHA_KEYS) subs[k] = fichaHasContent ? round2(clamp(num(rawSubs[k]), 0, 1)) : 0;
    }

    // Cobertura calculada: nas dimensões de conteúdo, a nota é a média ponderada entre o julgamento da IA e a
    // cobertura das informações alvo daquela área (o servidor calcula a cobertura a partir dos ids que a IA marcou).
    const obtidas: string[] = Array.isArray(gradeResult.informacoes_obtidas) ? gradeResult.informacoes_obtidas.map(String) : [];
    const subsIa = { ...subs };
    let coberturaDim: Record<string, number> = {};
    if (gabarito && caseV2) {
      coberturaDim = coberturaPorDimensao(caseV2, gabarito, obtidas);
      for (const [k, cov] of Object.entries(coberturaDim)) {
        if (k in subs) subs[k] = round2(subs[k] * (1 - COBERTURA_PESO) + cov * COBERTURA_PESO);
      }
    }

    const rawAnamneseSum = ANAMNESE_KEYS.reduce((s, k) => s + subs[k], 0);
    const base = baseScores(subs);
    const notaAnamnese = base.anamnese;
    const notaMai = base.mai;
    const notaFicha = base.ficha;

    const rawBp = gradeResult.bonus_penalidades || {};
    const bonus = clamp(Math.abs(num(rawBp.comunicacao_empatica_bonus)), 0, MAX_BONUS);
    const penalty = clamp(
      Math.abs(num(rawBp.erro_seguranca_penalidade)) + Math.abs(num(rawBp.ignorou_alergia_penalidade)),
      0,
      MAX_PENALTY,
    );
    const bonusPenalidades = {
      comunicacao_empatica_bonus: round2(bonus),
      erro_seguranca_penalidade: round2(Math.abs(num(rawBp.erro_seguranca_penalidade))),
      ignorou_alergia_penalidade: round2(Math.abs(num(rawBp.ignorou_alergia_penalidade))),
    };
    const notaFinal = round2(clamp(base.total + bonus - penalty, 0, 10));

    // Upsert grade (overwrite if re-graded)
    const { data: existing } = await supabase
      .from("virtual_patient_grades")
      .select("id")
      .eq("session_id", session_id)
      .maybeSingle();

    // Clinical Efficiency (0–5): cobertura da anamnese. O tamanho da conversa não entra
    // mais no cálculo (antes, passar de 25 mensagens reduzia o indicador).
    // Com gabarito: cobertura ponderada das informações alvo (Essencial 3, Importante 2, Complementar 1).
    const coverage = gabarito
      ? coberturaInformacoes(gabarito, obtidas)
      : clamp(rawAnamneseSum / ANAMNESE_KEYS.length, 0, 1);
    const efficiency = Math.round(coverage * 5 * 10) / 10;

    const payload = {
      session_id,
      class_virtual_patient_id,
      subscores: subs,
      bonus_penalidades: bonusPenalidades,
      nota_final: notaFinal,
      nota_microlearning: efficiency,
      feedback_resumido: feedbackResumido,
      orientacoes_melhoria: orientacoes,
      flags_seguranca: Array.isArray(gradeResult.flags_seguranca) ? gradeResult.flags_seguranca : [],
      rubric_version: (fichaEnabled ? RUBRIC_VERSION_FICHA : RUBRIC_VERSION) + (gabarito ? "+gabarito" : ""),
      grading_model: GRADING_MODEL,
      graded_at: new Date().toISOString(),
      raw_ai_response: rawResponse + "\n\n[SERVIDOR] " + JSON.stringify({ subscores_ia: subsIa, cobertura_por_dimensao: coberturaDim, cobertura_peso: gabarito ? COBERTURA_PESO : 0 }),
    };

    if (existing?.id) {
      const { error: updErr } = await supabase.from("virtual_patient_grades").update(payload).eq("id", existing.id);
      if (updErr) console.error("Failed to update grade:", updErr);
    } else {
      const { error: insertErr } = await supabase.from("virtual_patient_grades").insert(payload);
      if (insertErr) console.error("Failed to save grade:", insertErr);
    }

    return new Response(JSON.stringify({
      success: true,
      grade: {
        ...gradeResult,
        subscores: subs,
        bonus_penalidades: bonusPenalidades,
        nota_anamnese: notaAnamnese, // 0–6 sem ficha, 0–4 com ficha
        nota_anamnese_0a6: notaAnamnese,
        nota_mai_0a4: notaMai,
        nota_ficha_0a2: notaFicha,
        nota_final_0a10: notaFinal,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Grade error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
