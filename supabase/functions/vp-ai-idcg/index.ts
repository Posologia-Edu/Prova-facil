// Auto-grades IDCG (Índice de Desempenho Clínico Global) + ISC (Índice de
// Segurança Clínica) for one or more virtual-patient sessions using the
// rubric from the study "Integração de LLM e RAG para Simulações Clínicas".
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Você é um AVALIADOR CIENTÍFICO de simulações clínicas com pacientes virtuais.
Sua função é aplicar a rubrica pré-configurada do estudo (IDCG + ISC) sobre o transcript da interação.

═════ IDCG — Índice de Desempenho Clínico Global (Likert 1–5, casas 0.5) ═════
Pontue cada uma das 5 dimensões (1 = insuficiente, 5 = excelente):
1. idcg_empathy — Empatia e comunicação: linguagem acessível, acolhimento, respeito.
2. idcg_active_listening — Escuta ativa: reformulação, perguntas abertas, validação.
3. idcg_reasoning — Raciocínio clínico: coleta de dados, hipóteses coerentes, integração.
4. idcg_conduct — Conduta terapêutica: escolha farmacoterapêutica adequada, orientações.
5. idcg_safety — Segurança do paciente: identificação de alergias, interações, contraindicações, dose.

═════ ISC — Condutas Inseguras Identificadas ═════
Liste TODAS as condutas inseguras observáveis no transcript. Para cada uma:
- description: descrição objetiva (≤ 140 caracteres)
- severity: 1 (leve), 2 (moderada), 3 (grave)

Exemplos de condutas inseguras:
- Recomendação/aceite de AINE em DRC, gestante, úlcera ativa → 3
- Não perguntar alergias antes de recomendar medicamento → 2
- Ignorar interação medicamentosa relevante → 3
- Não investigar gestação em mulher em idade fértil → 2
- Falta de orientação sobre efeitos adversos → 1
- Recomendar dose fora da faixa terapêutica → 3

═════ QUALIDADE CONVERSACIONAL (Likert 1–5) ═════
- realism_score — Realismo geral da interação (do lado do estudante).
- empathy_verbal_score — Empatia verbal demonstrada.
- clinical_adequacy_score — Adequação clínica geral.
- naturalness_score — Naturalidade da conduta.

═════ ROBUSTEZ INFORMACIONAL ═════
- rag_accuracy (0–1) — Fração de respostas farmacologicamente corretas (verificar factualidade).
- behavioral_stability_pct (0–100) — Estabilidade comportamental do estudante durante a sessão (%).

═════ ANÁLISE QUALITATIVA ═════
- qualitative_notes — Texto em 2ª pessoa ("Você..."), 4–6 frases, cobrindo momentos-chave, padrões
  e recomendações. Tom mentor, científico, respeitoso.

═════ REGRAS DE OUTPUT ═════
Responda EXCLUSIVAMENTE com JSON válido, sem markdown/comentários.

Schema:
{
  "idcg_empathy": number,
  "idcg_active_listening": number,
  "idcg_reasoning": number,
  "idcg_conduct": number,
  "idcg_safety": number,
  "unsafe_conducts": [{"description": string, "severity": 1|2|3}, ...],
  "realism_score": number,
  "empathy_verbal_score": number,
  "clinical_adequacy_score": number,
  "naturalness_score": number,
  "rag_accuracy": number,
  "behavioral_stability_pct": number,
  "qualitative_notes": string
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sessionIds } = await req.json();
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return new Response(JSON.stringify({ error: "sessionIds obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const results: Record<string, any> = {};
    const errors: Record<string, string> = {};

    for (const sid of sessionIds) {
      try {
        const { data: session } = await admin
          .from("virtual_patient_sessions")
          .select("id, patient_id, module, class_virtual_patient_id, group_id, student_email, student_name, research_consent")
          .eq("id", sid)
          .maybeSingle();

        if (!session) { errors[sid] = "sessão não encontrada"; continue; }
        if (session.research_consent === false) {
          errors[sid] = "estudante recusou consentimento LGPD";
          continue;
        }

        const { data: msgs } = await admin
          .from("virtual_patient_messages")
          .select("role, content, encounter, created_at")
          .eq("session_id", sid)
          .order("created_at", { ascending: true });

        if (!msgs || msgs.length < 2) {
          errors[sid] = "transcript insuficiente";
          continue;
        }

        // Build transcript
        const byEnc: Record<number, any[]> = {};
        for (const m of msgs) {
          const e = (m as any).encounter || 1;
          (byEnc[e] ||= []).push(m);
        }
        let transcript = "";
        for (const e of Object.keys(byEnc).sort()) {
          transcript += `\n=== ENCONTRO ${e} ===\n`;
          for (const m of byEnc[Number(e)]) {
            transcript += `${m.role === "user" ? "ESTUDANTE" : "PACIENTE"}: ${m.content}\n`;
          }
        }

        const userMsg = `[SESSÃO]
Paciente: ${session.patient_id} | Módulo: ${session.module}
Estudante: ${session.student_name || "—"} (${session.student_email || "—"})

[TRANSCRIPT COMPLETO]
${transcript}

Aplique agora a rubrica IDCG + ISC do system prompt e retorne o JSON.`;

        const { response } = await callAiWithFallback({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userMsg },
          ],
        });

        if (!response.ok) {
          errors[sid] = `AI ${response.status}`;
          continue;
        }

        const ai = await response.json();
        let content = ai.choices?.[0]?.message?.content || "";
        const m = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (m) content = m[1].trim();

        let parsed: any;
        try { parsed = JSON.parse(content); }
        catch { errors[sid] = "JSON inválido da IA"; continue; }

        // Derived metrics
        const idcgDims = [
          Number(parsed.idcg_empathy),
          Number(parsed.idcg_active_listening),
          Number(parsed.idcg_reasoning),
          Number(parsed.idcg_conduct),
          Number(parsed.idcg_safety),
        ].filter((n) => !Number.isNaN(n));
        const idcgScore = idcgDims.length
          ? Number((idcgDims.reduce((s, n) => s + n, 0) / idcgDims.length).toFixed(2))
          : null;

        const unsafe = Array.isArray(parsed.unsafe_conducts)
          ? parsed.unsafe_conducts
              .filter((u: any) => u && u.description)
              .map((u: any) => ({
                description: String(u.description),
                severity: [1, 2, 3].includes(Number(u.severity)) ? Number(u.severity) : 2,
              }))
          : [];
        const iscTotal = unsafe.reduce((s: number, u: any) => s + u.severity, 0);
        const iscCount = unsafe.length;
        const iscScore = iscCount ? Number((iscTotal / iscCount).toFixed(2)) : 0;
        const iscRisk = iscScore >= 2.5 ? "Alto" : iscScore >= 2.0 ? "Moderado" : iscScore > 0 ? "Baixo" : "Nulo";

        // Fetch patient module for clinical_context
        let clinicalContext: string | null = session.module || null;
        const { data: cp } = await admin
          .from("custom_virtual_patients")
          .select("category")
          .eq("id", session.patient_id)
          .maybeSingle();
        if (cp?.category) clinicalContext = cp.category;

        const payload = {
          session_id: sid,
          evaluator_id: userId,
          class_virtual_patient_id: session.class_virtual_patient_id,
          group_id: session.group_id,
          student_email: session.student_email,
          student_name: session.student_name,
          patient_id: session.patient_id,
          clinical_context: clinicalContext,
          idcg_empathy: parsed.idcg_empathy ?? null,
          idcg_active_listening: parsed.idcg_active_listening ?? null,
          idcg_reasoning: parsed.idcg_reasoning ?? null,
          idcg_conduct: parsed.idcg_conduct ?? null,
          idcg_safety: parsed.idcg_safety ?? null,
          idcg_score: idcgScore,
          unsafe_conducts: unsafe,
          isc_total: iscTotal,
          isc_count: iscCount,
          isc_score: iscScore,
          isc_risk_class: iscRisk,
          realism_score: parsed.realism_score ?? null,
          empathy_verbal_score: parsed.empathy_verbal_score ?? null,
          clinical_adequacy_score: parsed.clinical_adequacy_score ?? null,
          naturalness_score: parsed.naturalness_score ?? null,
          rag_accuracy: parsed.rag_accuracy ?? null,
          behavioral_stability_pct: parsed.behavioral_stability_pct ?? null,
          qualitative_notes: parsed.qualitative_notes ?? null,
          evaluated_at: new Date().toISOString(),
        };

        const { error: upErr } = await admin
          .from("vp_research_metrics")
          .upsert(payload, { onConflict: "session_id,evaluator_id" });
        if (upErr) { errors[sid] = upErr.message; continue; }

        results[sid] = { idcg_score: idcgScore, isc_score: iscScore, isc_count: iscCount };
      } catch (e) {
        errors[sid] = (e as Error).message;
      }
    }

    return new Response(JSON.stringify({ results, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vp-ai-idcg error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
