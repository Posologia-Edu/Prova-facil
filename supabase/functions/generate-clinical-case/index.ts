import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANAMNESIS_PROMPT = `Você é um especialista em educação farmacêutica clínica. Gere um roteiro de paciente simulado para prática de anamnese farmacêutica.

O roteiro deve conter as seguintes seções claramente separadas:

1. **IDENTIFICAÇÃO DO PACIENTE**
   - Nome fictício, idade, sexo, profissão, estado civil

2. **QUEIXA PRINCIPAL**
   - Motivo da consulta farmacêutica (1-2 frases)

3. **HISTÓRIA DA DOENÇA ATUAL (HDA)**
   - Descrição cronológica dos sintomas, duração, fatores de melhora/piora

4. **MEDICAMENTOS EM USO**
   - Lista de medicamentos com dose, posologia e tempo de uso
   - Incluir pelo menos 3-5 medicamentos

5. **HISTÓRIA PREGRESSA**
   - Doenças anteriores, cirurgias, alergias

6. **HISTÓRIA SOCIAL**
   - Tabagismo, etilismo, atividade física, alimentação

7. **ORIENTAÇÕES AO ATOR/PACIENTE SIMULADO**
   - Como o paciente deve se comportar
   - Informações que só deve revelar se perguntado
   - Nível de conhecimento sobre seus medicamentos

Gere um caso realista e clinicamente relevante. Use linguagem clara e objetiva.`;

const RECONCILIATION_PROMPT = `Você é um especialista em educação farmacêutica clínica. Gere um caso clínico completo para prática de reconciliação medicamentosa.

O caso deve conter:

1. **DADOS DO PACIENTE**
   - Nome fictício, idade, sexo, peso, altura
   - Motivo da internação/consulta

2. **DIAGNÓSTICOS**
   - Lista de diagnósticos ativos (pelo menos 2-3)

3. **MEDICAMENTOS PRÉ-INTERNAÇÃO / USO DOMICILIAR**
   - Lista completa com nome, dose, posologia, via de administração
   - Incluir pelo menos 5-8 medicamentos

4. **MEDICAMENTOS PRESCRITOS NA INTERNAÇÃO / ATUAL**
   - Lista completa com nome, dose, posologia, via
   - Incluir discrepâncias intencionais (omissões, duplicidades, doses diferentes)

5. **EXAMES LABORATORIAIS RELEVANTES**
   - Resultados com valores de referência

6. **SINAIS VITAIS**
   - PA, FC, FR, Temperatura, SpO2

7. **DISCREPÂNCIAS PARA IDENTIFICAÇÃO**
   - Liste as discrepâncias que o aluno deve encontrar (para uso do professor)
   - Classifique cada uma (omissão, comissão, dose, frequência, via)

Gere um caso realista com discrepâncias clinicamente significativas para identificação pelos alunos.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    const { phase, theme } = await req.json();

    if (!phase || !["anamnesis", "reconciliation"].includes(phase)) {
      return new Response(JSON.stringify({ error: "Phase must be 'anamnesis' or 'reconciliation'" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!theme || typeof theme !== "string" || theme.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Theme is required (min 3 chars)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = phase === "anamnesis" ? ANAMNESIS_PROMPT : RECONCILIATION_PROMPT;

    const { response } = await callAiWithFallback(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Gere um caso clínico sobre o seguinte tema: ${theme.trim()}` },
        ],
      },
      { userId, promptType: `generate-clinical-case-${phase}` },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao gerar caso clínico" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract title from first meaningful line
    const lines = content.split("\n").filter((l: string) => l.trim());
    let title = `Caso - ${theme.trim().substring(0, 50)}`;
    for (const line of lines) {
      const clean = line.replace(/^[#*\s]+/, "").trim();
      if (clean.length > 5 && clean.length < 100) {
        title = clean;
        break;
      }
    }

    return new Response(JSON.stringify({ title, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
