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
    minWords: 120,
    instructions: `CAPA do processo. Inclua: nome completo do tribunal, comarca, vara competente, número do processo, classe ("Ação Penal Pública"), órgão julgador (Tribunal do Júri), partes (Autor: Ministério Público; Réu: nome e qualificação), data de distribuição, juiz responsável (nome fictício), e o objeto da ação em uma linha. Use formatação em bloco profissional.`,
  },
  relato_fatos: {
    minWords: 350,
    instructions: `RELATO DOS FATOS detalhado e cronológico. Narre data por data o que aconteceu clinicamente: início dos sintomas, busca por atendimento, internação, conduta médica adotada (medicamentos com doses exatas, vias, posologia), evolução, complicações e desfecho. Inclua nomes das instituições (fictícios), CRM/CRO/CRF do réu, e contextos sociais relevantes. Esconda 2 EASTER EGGS sutis (detalhes que mais tarde se revelam importantes para a discussão).`,
  },
  denuncia: {
    minWords: 400,
    instructions: `DENÚNCIA do Ministério Público em linguagem jurídica formal. Estrutura: cabeçalho com referência ao IP/inquérito, qualificação do denunciado, descrição típica dos fatos com tipificação penal (artigos do Código Penal), pedido de recebimento da denúncia, rol de testemunhas (3-5 nomes), pedido final. Use juridiquês correto e cite artigos específicos (ex: art. 121 §3º CP - homicídio culposo; art. 18 II CP, etc.).`,
  },
  laudo_iml: {
    minWords: 350,
    instructions: `LAUDO IML/NECROPSIA OU PERÍCIA TÉCNICA. Cabeçalho com perito responsável e nº do laudo. Identificação do periciado, descrição externa (se aplicável), descrição interna por sistemas (cardiovascular, respiratório, digestivo, urinário, neurológico), achados macroscópicos e microscópicos, exames complementares solicitados pelo perito (toxicologia, histopatologia), CONCLUSÃO técnica com causa mortis ou natureza das lesões. Use terminologia médico-legal precisa. Adicione um POLO TWIST: um achado inesperado que abre margem para interpretação alternativa.`,
  },
  prontuario: {
    minWords: 500,
    instructions: `PRONTUÁRIO MÉDICO COMPLETO em formato hospitalar. Inclua TODAS as evoluções diárias da internação (data/hora, profissional, sinais vitais, queixas, conduta, prescrição), prescrições médicas com horários, evoluções de enfermagem, intercorrências, anotações de plantão. Cada evolução deve ser realista (10-20 linhas cada). Inclua pelo menos 5 dias de evolução. Mostre dados clínicos COMPATÍVEIS com o tema dos objetivos (ex: para pielonefrite — leucocitose, febre, EAS alterado, urocultura, função renal). Esconda detalhes que serão importantes para a defesa E para a acusação.`,
  },
  exames: {
    minWords: 400,
    instructions: `EXAMES COMPLEMENTARES laboratoriais e de imagem. Apresente cada exame em formato de laudo real:
- Hemogramas seriados com valores numéricos e referências
- Bioquímica (função renal, hepática, eletrólitos, PCR, lactato)
- Urocultura/hemocultura com antibiograma detalhado
- Gasometria se aplicável
- Laudos de imagem (USG, TC, RX) com técnica, descrição e impressão diagnóstica

INCLUA NO TEXTO 2-3 ÂNCORAS DE IMAGEM no formato exato [[IMAGE:slug]] (slugs sugeridos: us-rins, tc-abdome, rx-torax) — essas âncoras serão substituídas por imagens médicas geradas separadamente. Posicione cada âncora logo abaixo do laudo correspondente.`,
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
    const content = (data?.choices?.[0]?.message?.content || "").trim();
    if (!content) throw new Error("Conteúdo vazio retornado pela IA");

    sections[targetIdx] = { ...target, status: "ready", content, error: null };

    // Reassemble process_content from all ready sections
    const assembled = sections
      .filter((s) => s.status === "ready" && s.content)
      .map((s) => `## ${s.title}\n\n${s.content}`)
      .join("\n\n---\n\n");

    await admin
      .from("mock_trial_cases")
      .update({ sections_json: sections, process_content: assembled })
      .eq("id", caseId);

    // If this is the "exames" section and no images exist yet, queue image generation
    if (sectionKey === "exames") {
      const slugMatches = Array.from(content.matchAll(/\[\[IMAGE:([a-z0-9-]+)\]\]/gi)).map((m: any) => m[1]);
      if (slugMatches.length > 0) {
        const { data: existing } = await admin.from("mock_trial_case_images").select("slug").eq("case_id", caseId);
        const existingSlugs = new Set((existing || []).map((x: any) => x.slug));
        const toInsert = slugMatches
          .filter((s) => !existingSlugs.has(s))
          .map((slug) => ({
            case_id: caseId,
            slug,
            anchor: `[[IMAGE:${slug}]]`,
            title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            caption: "",
            prompt: `Realistic medical imaging exam (${slug}) compatible with the clinical case described in the learning objectives: ${caseRow.learning_objectives.slice(0, 200)}`,
            status: "pending",
          }));
        if (toInsert.length > 0) {
          await admin.from("mock_trial_case_images").insert(toInsert);
          // Trigger generation in background (fire-and-forget)
          for (const img of toInsert) {
            fetch(`${SUPABASE_URL}/functions/v1/generate-mock-trial-image`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
              body: JSON.stringify({ slug: img.slug, caseId }),
            }).catch(() => {});
          }
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
