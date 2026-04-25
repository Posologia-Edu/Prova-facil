// Generates a process SKELETON: 10 standard legal sections, each with a short
// summary anchored to the user's learning objectives. Returns quickly and
// stores result in mock_trial_cases.sections_json.
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

// Fixed 10-section structure (full standard legal process)
const STANDARD_SECTIONS = [
  { key: "capa", title: "1. Capa do Processo" },
  { key: "relato_fatos", title: "2. Relato dos Fatos" },
  { key: "denuncia", title: "3. Denúncia / Acusação Formal (MP)" },
  { key: "laudo_iml", title: "4. Laudo IML / Necropsia" },
  { key: "prontuario", title: "5. Prontuário Médico Completo" },
  { key: "exames", title: "6. Exames Complementares (com imagens)" },
  { key: "depoimento_reu", title: "7. Depoimento do Réu (Interrogatório)" },
  { key: "depoimentos_testemunhas", title: "8. Depoimentos de Testemunhas" },
  { key: "alegacoes_mp", title: "9. Alegações Finais do Ministério Público" },
  { key: "alegacoes_defesa", title: "10. Alegações Finais da Defesa" },
];

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
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { caseId, learningObjectives, caseNumber } = body || {};
    if (!caseId || !learningObjectives) {
      return new Response(JSON.stringify({ error: "caseId e learningObjectives são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Ownership check
    const { data: caseRow } = await admin
      .from("mock_trial_cases")
      .select("id, mock_trial_id, mock_trials(user_id)")
      .eq("id", caseId)
      .single();
    if (!caseRow || (caseRow as any).mock_trials?.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ask AI to produce: title + global premise + per-section short summary (2-3 lines)
    const prompt = `Você é um especialista em educação médica e processos jurídicos brasileiros. Sua tarefa é montar o ESQUELETO de um processo de Júri Simulado para fins acadêmicos, baseado ESTRITAMENTE nos objetivos de aprendizagem abaixo.

OBJETIVOS DE APRENDIZAGEM (siga à risca — não invente outro tema):
"""
${learningObjectives}
"""

REGRAS INVIOLÁVEIS:
- O caso deve girar 100% em torno do tema dos objetivos.
- O RÉU pode ser QUALQUER profissional de saúde — médico, farmacêutico, enfermeiro, cirurgião-dentista, fisioterapeuta, nutricionista, biomédico, técnico de enfermagem etc. Escolha a profissão MAIS COERENTE com o ato profissional questionado nos objetivos:
  * Erro de prescrição/conduta clínica médica → Médico (com especialidade adequada)
  * Erro de dispensação, manipulação, conciliação medicamentosa, farmacotécnica ou farmacovigilância → Farmacêutico
  * Erro de administração de medicamento, cuidado de enfermagem, punção, sondagem → Enfermeiro
  * Erro em procedimento odontológico, prescrição odontológica → Cirurgião-dentista
  * Erro em terapia/reabilitação física → Fisioterapeuta
  * Erro em conduta nutricional/dietoterápica → Nutricionista
  * Erro em exame laboratorial/diagnóstico → Biomédico
- O DESENHO do processo (tipificação penal, conselho de classe citado, código de ética aplicável, lex artis, testemunhas técnicas) DEVE refletir a profissão escolhida. Ex: farmacêutico → CFF/CRF + Código de Ética Farmacêutica; enfermeiro → COFEN/COREN + Código de Ética dos Profissionais de Enfermagem; dentista → CFO/CRO + Código de Ética Odontológica; médico → CFM/CRM + Código de Ética Médica.
- NÃO use exemplos genéricos, NÃO copie temas anteriores, NÃO use mineração/meio-ambiente a menos que o objetivo cite isso.
- Cada resumo de seção deve mencionar elementos concretos do tema (medicamentos, exames, achados clínicos relevantes).
- CENÁRIO FÍSICO (obrigatório variar): NÃO ambiente todos os processos em hospital. Escolha o cenário MAIS COERENTE com o ato profissional questionado e com a profissão do réu. Possibilidades incluem (mas não se limitam a):
  * Farmácia comunitária / drogaria
  * Farmácia hospitalar / central de manipulação
  * Unidade Básica de Saúde (UBS) / ESF
  * Unidade de Pronto Atendimento (UPA)
  * Ambulatório de especialidades
  * Pronto-socorro hospitalar / enfermaria / UTI (apenas quando o caso realmente exigir internação)
  * Home care / atenção domiciliar
  * Consultório odontológico, clínica de fisioterapia, consultório nutricional, laboratório de análises clínicas
  * Drogaria de hospital-dia, farmácia magistral, dispensário SUS
  Ex.: erro de dispensação por farmacêutico → Farmácia comunitária ou Farmácia hospitalar; conduta de enfermeiro em sala de vacina → UBS; orientação nutricional → ambulatório; conciliação medicamentosa em alta → enfermaria/farmácia clínica. Reflita esse cenário no relato dos fatos, no laudo, no prontuário (cabeçalho da unidade) e nas testemunhas (colegas do mesmo serviço).

Gere via tool call os seguintes campos:
- title: título do processo (curto, ex: "Ação Penal Pública: Suposta imperícia no tratamento de pielonefrite com Fosfomicina")
- premise: 4-6 linhas descrevendo a premissa clínica e jurídica do caso (vítima, réu, conflito, desfecho que motivou o processo)
- defendant_name: nome fictício do réu (use nomes brasileiros plausíveis, evite caricatos)
- defendant_role: profissão/cargo do réu coerente com o tema
- victim_name: nome fictício da vítima/paciente
- sections: array com EXATAMENTE 10 itens na ordem fornecida, cada um com:
  - key: ${STANDARD_SECTIONS.map((s) => `"${s.key}"`).join(", ")}
  - summary: 2-3 frases descrevendo o que esta seção CONTERÁ quando for gerada por completo. Mencione elementos clínicos específicos do tema (não diga apenas "relatará os fatos" — diga "narrará a internação do paciente X com pielonefrite refratária e a prescrição de fosfomicina trometamol em dose única off-label").

As 10 seções na ordem obrigatória são:
${STANDARD_SECTIONS.map((s, i) => `${i + 1}. key="${s.key}" — ${s.title}`).join("\n")}`;

    const tool = {
      type: "function",
      function: {
        name: "build_skeleton",
        description: "Retorna o esqueleto do processo",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            premise: { type: "string" },
            setting: { type: "string", description: "Cenário físico onde se passa o caso (ex: 'Farmácia comunitária do bairro X', 'UBS Vila Y', 'UPA Z', 'Enfermaria de clínica médica do Hospital W'). Coerente com a profissão do réu." },
            defendant_name: { type: "string" },
            defendant_role: { type: "string" },
            victim_name: { type: "string" },
            sections: {
              type: "array",
              minItems: 10,
              maxItems: 10,
              items: {
                type: "object",
                properties: {
                  key: { type: "string", enum: STANDARD_SECTIONS.map((s) => s.key) },
                  summary: { type: "string", minLength: 50 },
                },
                required: ["key", "summary"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "premise", "setting", "defendant_name", "defendant_role", "victim_name", "sections"],
          additionalProperties: false,
        },
      },
    };

    const { response } = await callAiWithFallback(
      {
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "Você é um especialista em educação médica e direito penal brasileiro. Responda apenas via tool call." },
          { role: "user", content: prompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "build_skeleton" } },
      },
      { userId, promptType: "mock_trial_skeleton" },
    );

    if (!response.ok) {
      const txt = await response.text().catch(() => "");
      console.error("AI error:", response.status, txt);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido, tente em alguns instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI error ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Resposta da IA sem tool call");
    const parsed = JSON.parse(toolCall.function.arguments);

    // Build sections_json
    const sections = STANDARD_SECTIONS.map((s, idx) => {
      const aiSec = (parsed.sections || []).find((x: any) => x.key === s.key);
      return {
        id: crypto.randomUUID(),
        key: s.key,
        title: s.title,
        summary: aiSec?.summary || "",
        content: "",
        status: "pending", // pending | generating | ready | failed
        order: idx,
        error: null,
      };
    });

    // Save to case
    await admin
      .from("mock_trial_cases")
      .update({
        title: parsed.title || "Processo Júri Simulado",
        case_number: caseNumber || `001/${new Date().getFullYear()}`,
        learning_objectives: learningObjectives,
        sections_json: sections,
        process_content: "", // will be assembled from sections later
        characters_json: [
          { role: "Cenário", name: parsed.setting || "A definir", profession: "Local físico onde o caso se desenrola" },
          { role: "Réu", name: parsed.defendant_name || "Dr(a). Réu", profession: parsed.defendant_role || "Profissional de saúde" },
          { role: "Vítima", name: parsed.victim_name || "Paciente" },
        ],
        generation_status: "skeleton_ready",
      })
      .eq("id", caseId);

    return new Response(
      JSON.stringify({ ok: true, sections, premise: parsed.premise, title: parsed.title }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("skeleton error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
