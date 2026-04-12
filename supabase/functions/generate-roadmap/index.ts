import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Apenas administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing updates to avoid duplicates
    const { data: existingUpdates } = await supabase
      .from("system_updates")
      .select("title, type")
      .order("created_at", { ascending: false })
      .limit(50);

    const existingTitles = (existingUpdates || []).map((u: any) => u.title).join("\n- ");

    const systemPrompt = `Você é um especialista em plataformas educacionais de saúde e tecnologia educacional. 
O sistema "ExamCraft Studio" é uma plataforma completa para avaliação e simulação em cursos de saúde. 

Funcionalidades existentes no sistema:
- Banco de questões com geração por IA
- Provas online com proctoring
- OSCE (exame clínico estruturado) com pacientes virtuais IA
- Simulações clínicas (Medicina, Enfermagem, Farmácia, Nutrição, Fisioterapia, Odontologia, Biomedicina)
- Documentação clínica (SOAP, reconciliação medicamentosa)
- Júri simulado para Direito em Saúde
- KFE (Key Feature Exam) e SCT (Script Concordance Test) e SJT (Situational Judgement Test)
- Teste de Progresso
- Gamificação para alunos (pontos, conquistas, rankings)
- Análise de competências com gráficos radar
- Feedback personalizado por IA
- Relatórios PDF avançados com gráficos
- Portfólio digital do aluno
- Integração com LMS (Moodle, Canvas, Google Classroom)
- Marketplace de provas
- Turmas e gestão de alunos
- Observação clínica estruturada
- Analytics e métricas de uso
- Sistema de assinaturas (Stripe)
- Tutor IA para alunos
- Agente de vendas IA
- Multi-idioma (PT/EN/ES)

Atualizações já existentes (NÃO repita estas):
- ${existingTitles || "Nenhuma ainda"}

Gere exatamente 8 novas funcionalidades inovadoras e altamente relevantes que agregariam muito valor ao sistema. 
Foque em tendências atuais de EdTech, IA aplicada à educação em saúde, e necessidades reais de professores e alunos.

Responda APENAS com um JSON array, sem markdown, sem explicação. Cada item deve ter:
- "title": nome curto e descritivo (máx 60 caracteres)
- "description": explicação em 1-2 frases do que faz e por que é útil
- "priority": "high", "medium" ou "low"
- "category": "feature", "improvement" ou "integration"`;

    const { response } = await callAiWithFallback(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Gere 8 novas funcionalidades para o roadmap do ExamCraft Studio." },
        ],
        model: "google/gemini-3-flash-preview",
      },
      { userId: user.id, promptType: "roadmap-generation" },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", errText);
      
      if (response.status === 402) {
        let errorMsg = "Créditos de IA insuficientes. Adicione créditos nas configurações do workspace.";
        try {
          const errJson = JSON.parse(errText);
          if (errJson.message) errorMsg = errJson.message;
        } catch {}
        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Falha ao gerar sugestões" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    let suggestions: any[];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      suggestions = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Falha ao interpretar resposta da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert suggestions as planned updates
    const inserts = suggestions.slice(0, 8).map((s: any) => ({
      type: "planned",
      title: String(s.title || "").slice(0, 100),
      description: String(s.description || ""),
      priority: ["high", "medium", "low"].includes(s.priority) ? s.priority : "medium",
      category: s.category || "feature",
      created_by: user.id,
    }));

    const { error: insertError } = await supabase.from("system_updates").insert(inserts);
    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Falha ao salvar sugestões" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, count: inserts.length }), {
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
