import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

async function loadCustomBaseline(patientId: string) {
  if (!patientId?.startsWith("custom:")) return null;
  const id = patientId.slice("custom:".length);
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await admin
    .from("custom_virtual_patients")
    .select("name, age, description, baseline_vitals, baseline_context")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    description: `${data.name}, ${data.age}a — ${data.description}`,
    baseline: data.baseline_vitals,
    context: data.baseline_context || "",
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Baseline conhecida de cada paciente (extraída dos system prompts do chat).
// Usada como referência inicial antes de ajustar com base na evolução clínica
// e nas condutas do estudante (medicamentos prescritos, tempo decorrido etc.).
const BASELINES: Record<string, {
  description: string;
  baseline: { PA: string; FC: number; FR: number; Temp: number; SatO2: number; Glicemia?: number };
  context: string;
}> = {
  pain_helena: {
    description: "Dona Helena, 67a, dor neuropática pós-herpética, hipertensa em uso de losartana 50 mg/dia (irregular).",
    baseline: { PA: "138/82", FC: 72, FR: 16, Temp: 36.4, SatO2: 97 },
    context: "HAS leve. Sensível a anti-hipertensivos adicionais. Pode ter PA elevada se ansiosa pela dor.",
  },
  pain_luciana: {
    description: "Luciana, 42a, fibromialgia, em uso de duloxetina.",
    baseline: { PA: "118/72", FC: 78, FR: 16, Temp: 36.3, SatO2: 98 },
    context: "Duloxetina pode elevar levemente PA. Sem comorbidades cardiovasculares.",
  },
  pain_rogerio: {
    description: "Rogério, 58a, motorista, IMC 36, hipertenso em uso irregular de hidroclorotiazida.",
    baseline: { PA: "148/92", FC: 80, FR: 18, Temp: 36.5, SatO2: 96 },
    context: "Obesidade + HAS mal controlada. AINEs reduzem efeito de anti-hipertensivos.",
  },
  pain_pedro: {
    description: "Pedro, 65a, câncer de pâncreas metastático, caquético, em cuidados paliativos.",
    baseline: { PA: "108/68", FC: 88, FR: 20, Temp: 36.8, SatO2: 95 },
    context: "Frágil. Opioides podem ↓PA, ↓FR e ↓SatO2. Monitorar depressão respiratória.",
  },
  pain_ana: {
    description: "Ana, 36a, advogada com cefaleia/enxaqueca, faz automedicação com analgésicos.",
    baseline: { PA: "122/78", FC: 74, FR: 16, Temp: 36.4, SatO2: 98 },
    context: "Triptanos podem ↑PA e ↑FC discretamente.",
  },
  inflammation_maria: {
    description: "Dona Maria, 72a, artrose, IMC 32, hipertensa em uso de enalapril e omeprazol; esquece hidroclorotiazida.",
    baseline: { PA: "142/86", FC: 68, FR: 16, Temp: 36.3, SatO2: 97 },
    context: "AINEs ↑PA e ↓função renal. Corticoide ↑PA e ↑glicemia. Idosa frágil.",
  },
  inflammation_antonio: {
    description: "Seu Antônio, 66a, gota, IMC 34, diabético (glibenclamida + metformina) e hipertenso (losartana). TFG ~38.",
    baseline: { PA: "145/90", FC: 76, FR: 16, Temp: 36.5, SatO2: 96, Glicemia: 165 },
    context: "DRC III. AINE/colchicina perigosos. Corticoide ↑glicemia. Alopurinol seguro.",
  },
  inflammation_renata: {
    description: "Renata, 39a, tendinite/bursite ocupacional, automedicação com ibuprofeno.",
    baseline: { PA: "118/74", FC: 72, FR: 16, Temp: 36.6, SatO2: 99 },
    context: "Saudável. AINE crônico pode causar gastrite/HAS.",
  },
  inflammation_wilson: {
    description: "Seu Wilson, 57a, AR em uso de sulfassalazina; refere febrícula.",
    baseline: { PA: "138/84", FC: 74, FR: 18, Temp: 37.1, SatO2: 97 },
    context: "Atividade inflamatória pode manter Temp levemente elevada e FC↑.",
  },
  inflammation_jose: {
    description: "José, 57a, polimialgia reumática em uso prolongado de prednisona; IMC 29,8.",
    baseline: { PA: "152/94", FC: 78, FR: 16, Temp: 36.4, SatO2: 97, Glicemia: 142 },
    context: "Corticoide crônico → HAS, hiperglicemia, risco cardiovascular. Desmame deve ser lento.",
  },
};

const SYSTEM_PROMPT = `Você é um simulador clínico que gera SINAIS VITAIS realistas para um paciente virtual durante uma consulta de farmácia clínica.

REGRAS:
1. Use a baseline do paciente como ponto de partida.
2. Ajuste os valores considerando:
   - Tempo decorrido na consulta (encontros 1, 2, 3 — entre encontros se passam dias/semanas).
   - Medicamentos que o estudante PRESCREVEU, AJUSTOU ou MANTEVE durante o atendimento.
   - Efeitos farmacológicos esperados (ex: AINE ↑PA, opioide ↓FR/↓SatO2/↓PA, corticoide ↑PA/↑glicemia, beta-bloqueador ↓FC, anti-hipertensivo ↓PA, simpaticomimético ↑PA/↑FC, duloxetina ↑PA leve, triptano ↑PA, hipoglicemiante ↓glicemia).
   - Estado clínico atual (dor intensa pode ↑PA e ↑FC; melhora da dor normaliza; febre ↑Temp e ↑FC).
   - Adesão e tempo de uso (se medicamento foi recém-iniciado, efeito ainda é parcial).
3. Os valores devem ser PLAUSÍVEIS — varie ±5 mmHg na PA, ±3 bpm na FC, ±0,2°C na Temp em relação à baseline ajustada.
4. Se algum medicamento prescrito poderia causar evento adverso clinicamente significativo (ex: hipotensão, bradicardia, depressão respiratória, hipoglicemia, hiperglicemia), reflita isso nos valores.

FORMATO DA RESPOSTA — RETORNE APENAS JSON VÁLIDO (sem markdown, sem comentários):
{
  "PA": "string mmHg ex 138/82",
  "FC": número bpm,
  "FR": número irpm,
  "Temp": número em °C com 1 decimal,
  "SatO2": número percentual,
  "Glicemia": número mg/dL (apenas se relevante para o caso, senão null),
  "justificativa": "1-2 frases explicando AO ESTUDANTE por que estes valores fazem sentido considerando o caso e suas condutas. Não repita o nome do paciente."
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { patientId, encounter = 1, transcript = [] } = await req.json();

    const info = BASELINES[patientId] || (await loadCustomBaseline(patientId));
    if (!patientId || !info) {
      return new Response(
        JSON.stringify({ error: "patientId inválido ou paciente sem baseline cadastrada." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resumo da conversa: enviamos somente as falas do estudante para extrair condutas.
    const studentTurns = (transcript as Array<{ role: string; content: string; encounter?: number }>)
      .filter((m) => m.role === "user")
      .map((m, i) => `[Estudante ${i + 1} • encontro ${m.encounter ?? 1}]: ${m.content}`)
      .join("\n");

    const userPrompt = `PACIENTE: ${info.description}
BASELINE inicial conhecida: ${JSON.stringify(info.baseline)}
CONTEXTO FARMACOLÓGICO: ${info.context}
ENCONTRO ATUAL: ${encounter}/3

CONDUTAS E PERGUNTAS DO ESTUDANTE ATÉ AGORA:
${studentTurns || "(nenhuma fala registrada)"}

Gere os sinais vitais NESTE momento da consulta, ajustando coerentemente. Retorne SOMENTE o JSON solicitado.`;

    const { response: aiResponse } = await callAiWithFallback({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      model: "google/gemini-2.5-flash",
    });

    const aiData = await aiResponse.json();
    const raw: string = aiData?.choices?.[0]?.message?.content || "";
    // Extrair JSON tolerando code-fences ou texto extra
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let parsed: any = null;
    try { parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw); }
    catch { parsed = null; }

    if (!parsed) {
      // Fallback: devolve a baseline com nota
      parsed = {
        ...info.baseline,
        justificativa: "Valores baseados na avaliação inicial — não foi possível ajustar dinamicamente neste momento.",
      };
    }

    // Montar mensagem formatada para o chat
    const lines = [
      "**📊 Sinais Vitais aferidos**",
      "",
      `- **PA:** ${parsed.PA} mmHg`,
      `- **FC:** ${parsed.FC} bpm`,
      `- **FR:** ${parsed.FR} irpm`,
      `- **Temperatura:** ${Number(parsed.Temp).toFixed(1)} °C`,
      `- **SatO₂:** ${parsed.SatO2}%`,
    ];
    if (parsed.Glicemia != null) lines.push(`- **Glicemia capilar:** ${parsed.Glicemia} mg/dL`);
    if (parsed.justificativa) {
      lines.push("", `_${parsed.justificativa}_`);
    }

    return new Response(
      JSON.stringify({
        vitals: parsed,
        message: lines.join("\n"),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("measure-virtual-patient-vitals error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Erro ao medir sinais vitais." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
