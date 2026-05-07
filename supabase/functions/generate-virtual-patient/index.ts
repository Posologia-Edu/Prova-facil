import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em educação clínica que cria pacientes virtuais para um simulador de farmacoterapia. Você deve gerar um paciente virtual COMPLETO no MESMO PADRÃO, profundidade e realismo dos exemplos abaixo. Os pacientes têm consultas em 3 ENCONTROS (anamnese inicial, retorno avaliando eficácia/segurança, ajustes finais).

PADRÃO DE QUALIDADE DOS PACIENTES JÁ EXISTENTES (use como referência absoluta):
- Identidade: nome próprio brasileiro, idade, profissão, estado civil, peso/altura, alergias, hábitos (tabagismo/etilismo), antecedentes familiares, adesão.
- Sinais vitais reais (PA, FC, Temp), IMC quando relevante.
- Expectativa do paciente em 1ª pessoa, frase curta e humana.
- Comportamento detalhado: postura, linguagem, tolerância à dor, automedicação, recursos financeiros, dúvidas, medos.
- Foco de aprendizagem (4-5 itens): pontos clínicos centrais e armadilhas (ex.: AINE em IR, opioide com efeitos GI).
- Roteiro dos 3 momentos com respostas a diferentes condutas (medicações certas, erradas, ausência de tratamento).
- Respostas abertas para fármacos/exames adicionais coerentes com a fisiopatologia.

REGRA OBRIGATÓRIA: O paciente DEVE responder no chat sempre como paciente leigo, breve, reativo, nunca espontâneo, em linguagem simples — exatamente como nos exemplos.

Você receberá: (1) categoria escolhida pelo usuário e (2) contexto clínico. Gere um paciente coerente com isso, original (não copie nomes existentes), e devolva SOMENTE JSON conforme o schema fornecido via tool calling.`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "create_virtual_patient",
    description: "Cria um paciente virtual completo no padrão do simulador.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome próprio brasileiro (ex.: 'Dona Helena', 'Seu Wilson', 'Renata')." },
        age: { type: "integer" },
        profession: { type: "string", description: "Profissão + estado civil curto. Ex.: 'Professora, casada, 2 filhos'." },
        description: { type: "string", description: "Diagnóstico/condição em 1 linha. Ex.: 'Lombalgia crônica em paciente com obesidade e HAS'." },
        baseline_vitals: {
          type: "object",
          description: "Sinais vitais iniciais para o módulo de aferição.",
          properties: {
            PA: { type: "string", description: "Ex.: '138/82'" },
            FC: { type: "integer" },
            FR: { type: "integer" },
            Temp: { type: "number" },
            SatO2: { type: "integer" },
            Glicemia: { type: ["integer", "null"] },
          },
          required: ["PA", "FC", "FR", "Temp", "SatO2"],
        },
        baseline_context: {
          type: "string",
          description: "1-2 frases descrevendo medicamentos em uso e fatores que afetam vitais (para o módulo de aferição ajustar dinamicamente).",
        },
        clinical_case: {
          type: "object",
          description: "Detalhes do caso (mesmo padrão do catálogo VP_CLINICAL_CASES existente).",
          properties: {
            expectation: { type: "string", description: "Expectativa em 1ª pessoa, frase curta." },
            history: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 6 },
            medications: { type: "array", items: { type: "string" }, minItems: 1 },
            vitals: { type: "string", description: "String formatada: 'PA xxx/xx mmHg | FC xx bpm | Temp xx,x °C | xx kg | x,xx m'." },
            physicalExam: { type: "string" },
            behaviors: { type: "array", items: { type: "string" }, minItems: 6, maxItems: 8 },
            learningFocus: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 5 },
          },
          required: ["expectation", "history", "medications", "vitals", "physicalExam", "behaviors", "learningFocus"],
        },
        system_prompt: {
          type: "string",
          description: `PROMPT COMPLETO do paciente para a IA do chat. DEVE seguir RIGOROSAMENTE este formato e profundidade:

"Você é [Nome], [idade] anos, [profissão/estado civil]. Peso: [x] kg, Altura: [x,xx] m. [Alergias / Nega alergias]. Histórico familiar: [...]. [Hábitos: tabagismo, etilismo]. Adesão: [...]. Sinais vitais: PA xxx/xx mmHg, FC xx bpm, Temp xx,x°C. Expectativa: '[frase 1ª pessoa]'.

Simule uma consulta em 3 momentos. Responda sempre como paciente, não ofereça condutas médicas.

Enquanto o estudante fizer perguntas de anamnese ou sugerir tratamentos/exames, mantenha-se no Momento 1. Quando o estudante disser que terminou a avaliação inicial ou pedir para ver a evolução, avance para o Momento 2. Quando ele sugerir ajustes no tratamento, avance para o Momento 3.

REGRAS GERAIS DO PACIENTE VIRTUAL: [as 5 regras já padronizadas].

REGRAS PARA EXAMES: [...].

EXAME FÍSICO: Se perguntar → [...].

Momento 1 (anamnese inicial):
- Queixa: [...]
- [...]

Momento 2 (retorno):
- [resposta a diferentes condutas farmacológicas + AINE/Opioide/Adjuvante etc., e exames laboratoriais com valores numéricos]

Momento 3 (ajustes finais):
- [respostas aos ajustes do aluno + frase final induzindo MAI]

Respostas abertas: [outros fármacos/exames coerentes com a fisiopatologia, sempre com valores numéricos]."

O prompt deve ter a MESMA densidade e detalhamento dos pacientes existentes (cerca de 1500-2500 caracteres).`,
        },
      },
      required: ["name", "age", "profession", "description", "baseline_vitals", "baseline_context", "clinical_case", "system_prompt"],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { category, clinical_context } = await req.json();
    if (!category || !clinical_context) {
      return new Response(JSON.stringify({ error: "category e clinical_context são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `CATEGORIA: ${category}
CONTEXTO CLÍNICO INFORMADO PELO USUÁRIO: ${clinical_context}

Gere um paciente virtual original e clinicamente coerente. Use a tool create_virtual_patient para retornar a estrutura.`;

    const { response } = await callAiWithFallback({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      model: "google/gemini-2.5-pro",
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "create_virtual_patient" } },
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes na sua workspace Lovable AI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao gerar paciente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "IA não retornou estrutura válida." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(toolCall.function.arguments);

    // Insert with service role (RLS already protects via user_id, mas garantimos consistência)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const { data: inserted, error: insertErr } = await admin
      .from("custom_virtual_patients")
      .insert({
        user_id: userId,
        category: String(category).trim(),
        name: args.name,
        age: args.age,
        profession: args.profession,
        description: args.description,
        clinical_context,
        system_prompt: args.system_prompt,
        baseline_vitals: args.baseline_vitals,
        baseline_context: args.baseline_context,
        clinical_case: { ...args.clinical_case, name: args.name, age: args.age, profession: args.profession, module: category, description: args.description },
      })
      .select("*")
      .single();

    if (insertErr) {
      console.error("DB error:", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ patient: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-virtual-patient error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
