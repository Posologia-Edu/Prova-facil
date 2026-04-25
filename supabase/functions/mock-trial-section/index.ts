// Generates ONE complete section of the mock trial process, using as context
// the case premise + previously generated sections, ensuring narrative coherence.
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

// Per-section length and style instructions
const SECTION_INSTRUCTIONS: Record<string, { minWords: number; instructions: string }> = {
  capa: {
    minWords: 350,
    instructions: `CAPA do processo em formato profissional. Estrutura obrigatória:

1) **Cabeçalho do tribunal**: nome completo do tribunal, comarca, vara competente, número do processo, classe ("Ação Penal Pública"), órgão julgador (Tribunal do Júri).
2) **Partes**: Autor (Ministério Público do Estado de XXX) e Réu (nome completo, qualificação, profissão, registro no conselho de classe correspondente — CRM/CRF/COREN/CRO/CREFITO/CRN/CRBM conforme a profissão do réu).
3) **Vítima**: nome e qualificação.
4) **Data de distribuição** e **juiz responsável** (nome fictício).
5) **Objeto da ação** em uma linha.
6) **FUNDAMENTAÇÃO JURÍDICA** (seção OBRIGATÓRIA e DETALHADA) — liste os dispositivos legais aplicáveis ao caso específico, com o texto resumido de cada artigo, agrupados em subtítulos. Sempre inclua quando aplicável:
   - **Código Penal**: artigos pertinentes (ex: art. 121 — Matar alguém; art. 121 §3º — homicídio culposo; art. 132 — perigo para a vida ou saúde de outrem; art. 129 — lesão corporal; art. 18 II — crime culposo). Cite SOMENTE os que se aplicam ao desfecho do caso.
   - **Código de Ética da profissão do réu** (escolha o correto):
     * Médico → Código de Ética Médica (Resolução CFM 2.217/2018) — arts. 1º, 2º, 11, 32, 33 etc.
     * Farmacêutico → Código de Ética da Profissão Farmacêutica (Resolução CFF 711/2021).
     * Enfermeiro → Código de Ética dos Profissionais de Enfermagem (Resolução COFEN 564/2017).
     * Cirurgião-Dentista → Código de Ética Odontológica (Resolução CFO 118/2012).
     * Fisioterapeuta → Código de Ética e Deontologia da Fisioterapia (Resolução COFFITO 424/2013).
     * Nutricionista → Código de Ética e Conduta do Nutricionista (Resolução CFN 599/2018).
     * Biomédico → Código de Ética do Profissional Biomédico (Resolução CFBM 198/2011).
   - **Lei do exercício profissional** correspondente (ex: Lei 12.842/2013 — Ato Médico; Lei 13.021/2014 — Farmácia; Lei 7.498/1986 — Enfermagem; Lei 5.081/1966 — Odontologia etc.).
   - **Legislação sanitária/clínica específica** quando pertinente (ex: RDC ANVISA sobre antimicrobianos, Portarias do MS, Diretrizes da SBI/SBU/SBN/SBD etc.).
   Para cada artigo, traga uma frase com o teor resumido contextualizado ao caso (NÃO apenas o número). Exemplo: "Art. 11 do CEM — O médico tem o dever de usar todos os meios disponíveis de diagnóstico e tratamento cientificamente reconhecidos em favor do paciente, dispositivo invocado pela acusação ao questionar a escolha de fosfomicina como monoterapia em pielonefrite complicada."`,
  },
  relato_fatos: {
    minWords: 350,
    instructions: `RELATO DOS FATOS detalhado e cronológico. Narre data por data o que aconteceu clinicamente: início dos sintomas, busca por atendimento, internação, conduta profissional adotada (medicamentos com doses exatas, vias, posologia, ou procedimento técnico realizado), evolução, complicações e desfecho. Inclua nomes das instituições (fictícios), registro do conselho de classe do réu (CRM/CRF/COREN/CRO conforme profissão), e contextos sociais relevantes. Esconda 2 EASTER EGGS sutis (detalhes que mais tarde se revelam importantes para a discussão).`,
  },
  denuncia: {
    minWords: 400,
    instructions: `DENÚNCIA do Ministério Público em linguagem jurídica formal. Estrutura: cabeçalho com referência ao IP/inquérito, qualificação do denunciado (incluindo registro no conselho de classe correto), descrição típica dos fatos com tipificação penal (artigos do Código Penal), pedido de recebimento da denúncia, rol de testemunhas (3-5 nomes), pedido final. Use juridiquês correto e cite artigos específicos.`,
  },
  laudo_iml: {
    minWords: 350,
    instructions: `LAUDO IML/NECROPSIA OU PERÍCIA TÉCNICA. Cabeçalho com perito responsável e nº do laudo. Identificação do periciado, descrição externa (se aplicável), descrição interna por sistemas (cardiovascular, respiratório, digestivo, urinário, neurológico), achados macroscópicos e microscópicos, exames complementares solicitados pelo perito (toxicologia, histopatologia), CONCLUSÃO técnica com causa mortis ou natureza das lesões. Use terminologia médico-legal precisa. Adicione um POLO TWIST: um achado inesperado que abre margem para interpretação alternativa.`,
  },
  prontuario: {
    minWords: 600,
    instructions: `PRONTUÁRIO MÉDICO COMPLETO em formato hospitalar. Inclua TODAS as evoluções diárias da internação (data/hora, profissional, sinais vitais, queixas, conduta, prescrição), prescrições com horários, evoluções de enfermagem, intercorrências, anotações de plantão. Cada evolução deve ser realista (10-20 linhas cada). Inclua pelo menos 5 dias de evolução.

**OBRIGATÓRIO — Use TABELAS Markdown completas para TODOS os dados quantitativos:**
- **Sinais vitais seriados**: tabela com colunas Data/Hora | PA | FC | FR | Temp | SatO2 | Diurese — uma linha por aferição.
- **Prescrição médica/profissional**: tabela com Medicamento | Dose | Via | Posologia | Início | Suspensão.
- **Balanço hídrico diário**: tabela com Data | Entrada (mL) | Saída (mL) | Balanço.
- **Escalas aplicadas** (Glasgow, qSOFA, NEWS, dor, Braden): tabela com Data/Hora | Escore.

Mostre dados clínicos COMPATÍVEIS com o tema dos objetivos. Esconda detalhes importantes para a defesa E para a acusação.`,
  },
  exames: {
    minWords: 500,
    instructions: `EXAMES COMPLEMENTARES laboratoriais e de imagem. **TODOS** os resultados quantitativos DEVEM ser apresentados em **TABELAS Markdown completas**, jamais em texto corrido:

- **Hemograma** (todos os dias colhidos): tabela com Parâmetro | Valor D1 | Valor D2 | ... | Referência. Inclua TODAS as linhas: Hemácias, Hb, Ht, VCM, HCM, CHCM, RDW, Leucócitos totais, Bastões, Segmentados, Linfócitos, Monócitos, Eosinófilos, Basófilos, Plaquetas.
- **Bioquímica completa**: tabela com Ureia, Creatinina, TFG estimada, Sódio, Potássio, Cloro, Cálcio, Magnésio, Fósforo, Glicemia, AST, ALT, FA, GGT, BT/BD/BI, Albumina, PCR, Procalcitonina, Lactato — Valor | Referência por dia.
- **Gasometria** (se aplicável): pH, pCO2, pO2, HCO3, BE, SatO2, Lactato.
- **EAS / Urina tipo I**: Aspecto, Densidade, pH, Proteínas, Glicose, Cetonas, Hemoglobina, Nitrito, Esterase leucocitária, Leucócitos/campo, Hemácias/campo, Cilindros, Cristais, Bactérias.
- **Urocultura/Hemocultura com ANTIBIOGRAMA**: tabela com Antibiótico testado | MIC (µg/mL) | Interpretação (S/I/R) — liste ao menos 12 antibióticos relevantes ao germe identificado (ex: Ampicilina, Amoxicilina-clavulanato, Cefalexina, Cefuroxima, Ceftriaxona, Cefepime, Ciprofloxacino, Levofloxacino, Nitrofurantoína, Fosfomicina, Sulfametoxazol-trimetoprim, Gentamicina, Amicacina, Meropenem, Ertapenem, Piperacilina-tazobactam).
- **Coagulograma**: TAP, INR, TTPA, Fibrinogênio, D-dímero.
- **Marcadores específicos** ao tema (ex: HbA1c, troponina, BNP, amilase, lipase, TSH conforme caso).

Para **laudos de imagem** (USG, TC, RX, RM, ECG, endoscopia, microscopia, fundoscopia, dermatoscopia, anatomia patológica, etc.): cabeçalho com técnica, descrição detalhada e impressão diagnóstica.

REGRAS DE IMAGENS COMPLEMENTARES (CRÍTICO):
- Inclua **APENAS as imagens estritamente necessárias** para o entendimento do caso. Pode ser **0, 1, 2, 3 ou 4** imagens — nunca acrescente exames que não fazem sentido clínico.
- As imagens devem ser **totalmente contextualizadas** ao caso (região anatômica correta, modalidade adequada à hipótese diagnóstica, achado específico da patologia em questão). NÃO use por padrão "us-rins", "tc-abdome" ou "rx-torax" — escolha a modalidade e a região conforme o caso (ex.: para AVC isquêmico use "tc-cranio-sem-contraste"; para apendicite use "us-fid" ou "tc-abdome-com-contraste"; para fratura de fêmur "rx-femur-ap-perfil"; para endocardite "ecocardiograma-transesofagico"; para leucemia "esfregaço-sangue-periférico"; para melanoma "dermatoscopia"; etc.).
- Para CADA imagem incluída, faça DUAS coisas:
  1) Posicione no texto a âncora exata \`[[IMAGE:slug-kebab-case]]\` logo abaixo do laudo correspondente.
  2) Ao FINAL do conteúdo da seção, adicione um bloco JSON único delimitado assim:

\`\`\`image-manifest
[
  {
    "slug": "tc-cranio-sem-contraste",
    "title": "TC de crânio sem contraste",
    "caption": "Corte axial demonstrando hipodensidade em território da ACM esquerda",
    "prompt": "Realistic non-contrast axial CT scan of the brain showing a hypodense area in the left middle cerebral artery territory consistent with acute ischemic stroke, grayscale, hospital diagnostic quality, anatomical orientation markers, no text overlay"
  }
]
\`\`\`

- Os \`slug\` no JSON devem bater EXATAMENTE com os usados nas âncoras \`[[IMAGE:...]]\`.
- O \`prompt\` deve ser em inglês, descritivo, específico do achado patológico do caso, pronto para um modelo de imagem médica realista.
- Se o caso NÃO precisar de imagens (ex.: caso puramente farmacológico/laboratorial/ético), NÃO insira âncoras nem o bloco JSON.`,
  },
  depoimento_reu: {
    minWords: 600,
    instructions: `INTERROGATÓRIO/DEPOIMENTO DO RÉU em formato de transcrição (Juiz: ... / Réu: ... / Promotor: ... / Defensor: ...). Mínimo 25 trocas de fala. O réu deve defender sua conduta tecnicamente, citando literatura/diretrizes (mesmo que controversas), explicar seu raciocínio clínico, ter momentos de hesitação humana. Inclua perguntas técnicas cruzadas do MP tentando demonstrar negligência/imperícia, e o defensor protegendo o réu. Mantenha coerência com prontuário e laudo.`,
  },
  depoimentos_testemunhas: {
    minWords: 800,
    instructions: `DEPOIMENTOS DE 4 TESTEMUNHAS (mínimo) em formato transcrição. Para cada uma: qualificação completa (nome, idade, profissão, vínculo com o caso), advertência legal, depoimento longo (mínimo 15 trocas de fala). Inclua:
- 1 testemunha técnica de acusação (médico assistente/parecerista que critica a conduta)
- 1 testemunha técnica de defesa (especialista que defende a conduta)
- 1 familiar da vítima (relato emocional)
- 1 colega de trabalho do réu (caráter)
Cada depoimento deve trazer informação NOVA e às vezes contraditória entre si. Inclua mais EASTER EGGS.`,
  },
  alegacoes_mp: {
    minWords: 600,
    instructions: `ALEGAÇÕES FINAIS DO MINISTÉRIO PÚBLICO. Linguagem jurídica formal, estrutura: I - Síntese fática; II - Materialidade (citando exames, laudo, prontuário); III - Autoria; IV - Tipicidade (citação de artigos do CP e da Lei 12.842/2013 - Ato Médico, ou equivalente da profissão); V - Análise da conduta culposa (negligência/imprudência/imperícia) com base na literatura médica; VI - Pedido de condenação. Cite jurisprudência fictícia mas plausível (STJ, TJ).`,
  },
  alegacoes_defesa: {
    minWords: 600,
    instructions: `ALEGAÇÕES FINAIS DA DEFESA. Estrutura: I - Preliminar (se houver); II - Mérito - inexistência de nexo causal; III - Conduta dentro da lex artis (citar diretrizes da especialidade, ex: SBI, SBU, SBN); IV - Risco inerente ao procedimento/doença; V - Princípio do in dubio pro reo; VI - Pedido de absolvição. Use o POLO TWIST do laudo IML como argumento central. Cite jurisprudência fictícia.`,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { caseId, sectionKey } = body || {};
    if (!caseId || !sectionKey) {
      return new Response(JSON.stringify({ error: "caseId e sectionKey são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: caseRow } = await admin
      .from("mock_trial_cases")
      .select("id, title, case_number, learning_objectives, characters_json, sections_json, mock_trial_id, mock_trials(user_id)")
      .eq("id", caseId)
      .single();
    if (!caseRow || (caseRow as any).mock_trials?.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sections: any[] = Array.isArray(caseRow.sections_json) ? (caseRow.sections_json as any[]) : [];
    const targetIdx = sections.findIndex((s) => s.key === sectionKey);
    if (targetIdx < 0) {
      return new Response(JSON.stringify({ error: "Seção não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const target = sections[targetIdx];
    const cfg = SECTION_INSTRUCTIONS[sectionKey];
    if (!cfg) {
      return new Response(JSON.stringify({ error: "Seção desconhecida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark generating
    sections[targetIdx] = { ...target, status: "generating", error: null };
    await admin.from("mock_trial_cases").update({ sections_json: sections }).eq("id", caseId);

    // Build context from previously generated sections (only ready ones with content)
    const priorContext = sections
      .filter((s, i) => i < targetIdx && s.status === "ready" && s.content)
      .map((s) => `### ${s.title}\n${(s.content as string).slice(0, 4000)}`)
      .join("\n\n---\n\n");

    const summariesAll = sections.map((s) => `- ${s.title}: ${s.summary}`).join("\n");
    const characters = (caseRow.characters_json as any[]) || [];
    const charsStr = characters.map((c) => `- ${c.role}: ${c.name}${c.profession ? ` (${c.profession})` : ""}`).join("\n");

    const prompt = `Você é um especialista em educação médica e direito penal brasileiro. Vai gerar UMA seção específica de um processo de Júri Simulado, mantendo COERÊNCIA absoluta com:
1) Os objetivos de aprendizagem
2) As partes do processo
3) As seções já geradas anteriormente

# OBJETIVOS DE APRENDIZAGEM (núcleo do caso — NUNCA fuja disso)
${caseRow.learning_objectives}

# TÍTULO DO PROCESSO
${caseRow.title}

# Nº DO PROCESSO
${caseRow.case_number}

# PERSONAGENS
${charsStr || "(definir nomes coerentes com o tema)"}

# ROTEIRO COMPLETO DO PROCESSO (resumos de TODAS as seções — use para coerência narrativa)
${summariesAll}

${priorContext ? `# SEÇÕES JÁ GERADAS (mantenha coerência absoluta — mesmas datas, nomes, achados, doses)\n${priorContext}\n\n` : ""}# SEÇÃO A GERAR AGORA: ${target.title}

## Resumo planejado para esta seção
${target.summary}

## Instruções específicas desta seção
${cfg.instructions}

## REGRAS DE QUALIDADE OBRIGATÓRIAS
- Mínimo de ${cfg.minWords} palavras, em português brasileiro
- Tema clínico SEMPRE alinhado aos objetivos (NUNCA invente outro tema)
- Datas, nomes, doses e achados devem ser CONSISTENTES com as seções anteriores se já existirem
- Use Markdown rico: títulos com ##, negrito **assim**, listas, blocos de citação > quando útil
- NÃO repita o título da seção no início (o sistema já mostra)
- NÃO escreva meta-comentários ("aqui está a seção", "espero que ajude")
- Retorne APENAS o conteúdo Markdown da seção`;

    const { response } = await callAiWithFallback(
      {
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "Você é redator técnico-jurídico. Produza conteúdo extenso, realista, em Markdown." },
          { role: "user", content: prompt },
        ],
      },
      { userId, promptType: `mock_trial_section_${sectionKey}` },
    );

    if (!response.ok) {
      const txt = await response.text().catch(() => "");
      console.error("AI error:", response.status, txt);
      sections[targetIdx] = { ...target, status: "failed", error: `AI ${response.status}` };
      await admin.from("mock_trial_cases").update({ sections_json: sections }).eq("id", caseId);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Limite de uso atingido" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI ${response.status}`);
    }

    const data = await response.json();
    const rawContent = (data?.choices?.[0]?.message?.content || "").trim();
    if (!rawContent) throw new Error("Conteúdo vazio retornado pela IA");

    // Extract image-manifest JSON block (if any) and strip it from saved content
    let imageManifest: Array<{ slug: string; title?: string; caption?: string; prompt?: string }> = [];
    const manifestMatch = rawContent.match(/```image-manifest\s*([\s\S]*?)```/i);
    if (manifestMatch) {
      try {
        const parsed = JSON.parse(manifestMatch[1].trim());
        if (Array.isArray(parsed)) imageManifest = parsed.filter((x) => x && typeof x.slug === "string");
      } catch (e) {
        console.warn("Failed to parse image-manifest JSON:", (e as Error).message);
      }
    }
    const content = rawContent.replace(/```image-manifest[\s\S]*?```/gi, "").trim();

    sections[targetIdx] = { ...target, status: "ready", content, error: null };
    const reassembled = sections
      .filter((s: any) => s.status === "ready" && s.content)
      .map((s: any) => `## ${s.title}\n\n${s.content}`)
      .join("\n\n---\n\n");

    await admin
      .from("mock_trial_cases")
      .update({ sections_json: sections, process_content: reassembled })
      .eq("id", caseId);

    // Queue contextualized image generation only if anchors are present (0 = no images)
    const slugMatches = Array.from(content.matchAll(/\[\[IMAGE:([a-z0-9-]+)\]\]/gi)).map((m: any) => m[1]);
    const uniqueSlugs = Array.from(new Set(slugMatches));
    if (uniqueSlugs.length > 0) {
      const { data: existing } = await admin.from("mock_trial_case_images").select("slug").eq("case_id", caseId);
      const existingSlugs = new Set((existing || []).map((x: any) => x.slug));
      const manifestBySlug = new Map(imageManifest.map((m) => [m.slug, m]));
      const objectives = (caseRow.learning_objectives || "").slice(0, 300);
      const toInsert = uniqueSlugs
        .filter((s) => !existingSlugs.has(s))
        .map((slug) => {
          const meta = manifestBySlug.get(slug);
          const fallbackTitle = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          return {
            case_id: caseId,
            slug,
            anchor: `[[IMAGE:${slug}]]`,
            title: meta?.title || fallbackTitle,
            caption: meta?.caption || "",
            prompt:
              meta?.prompt ||
              `Realistic medical imaging exam (${fallbackTitle}) strictly contextualized to this clinical case. Show the specific pathological finding consistent with the case. Hospital diagnostic quality, proper modality conventions, anatomical orientation markers, no text overlay. Case context: ${objectives}`,
            status: "pending",
          };
        });
      if (toInsert.length > 0) {
        const { data: inserted } = await admin
          .from("mock_trial_case_images")
          .insert(toInsert)
          .select("id");
        for (const row of inserted || []) {
          fetch(`${SUPABASE_URL}/functions/v1/generate-mock-trial-image`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
            body: JSON.stringify({ imageId: (row as any).id }),
          }).catch(() => {});
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("section error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
