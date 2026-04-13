import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiWithFallback } from "../_shared/ai-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ────────────────────────────────────────────
   Course-specific prompt builders
   ──────────────────────────────────────────── */

const MEDICINE_AREAS = [
  "Clínica Médica", "Cirurgia", "Pediatria", "Ginecologia e Obstetrícia",
  "Saúde Coletiva / Medicina Preventiva", "Saúde Mental",
];

function buildMedicinePrompt(totalQuestions: number, subjectsList: string, difficulty: string, yearEntries: string) {
  const systemPrompt = `Você é um elaborador de provas do Teste Nacional de Progresso (TPN) da ABEM para o curso de Medicina no Brasil. Seu objetivo é gerar questões IDÊNTICAS em estilo, profundidade e formato às provas reais do TPN aplicadas pela ABEM/INEP.

FORMATO OBRIGATÓRIO (estilo TPN/ABEM real):
- Cada questão DEVE ser baseada em um CASO CLÍNICO detalhado e realista
- O enunciado (stem) deve ter entre 5 e 15 linhas, apresentando:
  • Identificação do paciente (sexo, idade)
  • Queixa principal e história da doença atual (HDA) com cronologia
  • Antecedentes pessoais e familiares relevantes
  • Dados do exame físico (sinais vitais, achados semiológicos)
  • Resultados de exames complementares quando pertinente (laboratoriais, imagem)
- A pergunta final deve ser direta e objetiva, ex: "Qual o diagnóstico mais provável?", "Qual a conduta mais adequada?", "Qual o achado esperado na investigação complementar?"
- Exatamente 4 alternativas (A, B, C, D) — NÃO 5
- Alternativas concisas (1 a 2 linhas), plausíveis e homogêneas
- Cada questão deve pertencer a uma área temática: ${MEDICINE_AREAS.join(", ")}

EXEMPLOS DE QUESTÕES NO ESTILO TPN REAL:

EXEMPLO 1 (Clínica Médica):
Enunciado: "Mulher, 58 anos, hipertensa e diabética, procura o pronto-socorro com queixa de dor torácica retroesternal em aperto, de forte intensidade, com irradiação para membro superior esquerdo, iniciada há 3 horas, acompanhada de sudorese e náuseas. Ao exame físico: PA 90x60 mmHg, FC 110 bpm, FR 24 irpm, SpO2 93% em ar ambiente. Ausculta pulmonar com estertores crepitantes em bases bilaterais. Ausculta cardíaca com B3 presente. ECG mostra supradesnivelamento do segmento ST em derivações V1 a V4. Qual a conduta inicial mais adequada?"
A) Trombólise com tenecteplase e encaminhamento para UTI coronariana
B) Angioplastia primária dentro de 90 minutos
C) Anticoagulação plena com heparina e observação clínica
D) Ecocardiograma de estresse e reavaliação ambulatorial

EXEMPLO 2 (Pediatria):
Enunciado: "Lactente de 8 meses, previamente hígido, é levado à UBS pela mãe com história de febre (38,5°C) há 2 dias, irritabilidade, recusa alimentar e episódios de vômito. A mãe relata que a criança está com menos fraldas molhadas. Ao exame: regular estado geral, mucosas secas, fontanela anterior levemente deprimida, turgor pastoso, tempo de enchimento capilar de 3 segundos, FC 160 bpm. Peso atual: 7,8 kg (peso prévio: 8,2 kg). Qual o grau de desidratação e a conduta mais adequada?"
A) Desidratação leve; terapia de reidratação oral no domicílio
B) Desidratação moderada; terapia de reidratação oral supervisionada na UBS (Plano B)
C) Desidratação grave; hidratação venosa imediata com SF 0,9% 20 mL/kg (Plano C)
D) Sem desidratação; orientação sobre sinais de alarme e retorno em 24h

REGRAS ADICIONAIS:
- NÃO crie questões teóricas puras ou de memorização isolada
- TODA questão deve partir de uma situação clínica concreta
- A dificuldade deve ser compatível com o ano: anos iniciais (1º-2º) devem cobrir semiologia, fisiologia e conceitos fundamentais em contexto clínico; anos avançados (4º-6º) devem exigir raciocínio clínico complexo e tomada de decisão
- Distribua as questões equilibradamente pelas áreas temáticas
- Inclua uma breve explicação/justificativa para a resposta correta

Use a tool "generate_questions" para retornar as questões.`;

  const userPrompt = `Gere ${totalQuestions} questões no estilo TPN/ABEM real para o Teste de Progresso de Medicina.

Áreas temáticas prioritárias: ${subjectsList}
Dificuldade geral: ${difficulty || "variada"}

Distribuição por ano:
${yearEntries}

IMPORTANTE: Cada questão deve ter um caso clínico detalhado como enunciado e EXATAMENTE 4 alternativas (A, B, C, D). Siga rigorosamente o formato dos exemplos fornecidos.`;

  return { systemPrompt, userPrompt };
}

function buildGenericPrompt(course: string, totalQuestions: number, subjectsList: string, difficulty: string, yearEntries: string) {
  const systemPrompt = `Você é um elaborador de provas do Teste de Progresso para o curso de ${course} no Brasil. Seu objetivo é gerar questões IDÊNTICAS em estilo e formato às provas reais de Teste de Progresso aplicadas pelas principais instituições brasileiras.

FORMATO OBRIGATÓRIO (estilo Teste de Progresso real):
- Cada questão deve ter exatamente 5 alternativas (A, B, C, D, E)
- Apenas UMA alternativa correta por questão
- Use VARIADOS formatos de questão, intercalando:
  1. Questão com TEXTO-BASE (artigo científico, dado epidemiológico, legislação, bula) seguido de pergunta
  2. Questão com AFIRMATIVAS numeradas (I, II, III, IV) + "É correto o que se afirma em:" com combinações nas alternativas
  3. Questão de ASSERÇÃO-RAZÃO: "Asserção I ... PORQUE ... Asserção II" com análise da relação
  4. Questão DIRETA com caso/situação profissional e pergunta objetiva
  5. Questão de ANÁLISE de dados (tabelas, gráficos descritos textualmente)

EXEMPLOS:

EXEMPLO 1 (Formato Afirmativas - Farmácia):
Enunciado: "Sobre a farmacocinética dos anti-inflamatórios não esteroidais (AINEs), analise as afirmativas:\n\nI. Os AINEs são, em sua maioria, ácidos fracos com elevada ligação a proteínas plasmáticas.\nII. A eliminação dos AINEs ocorre predominantemente por via renal, após metabolização hepática.\nIII. O ibuprofeno apresenta meia-vida plasmática longa (>24h), o que justifica sua posologia de dose única diária.\nIV. A administração concomitante de AINEs com anticoagulantes orais não apresenta relevância clínica.\n\nÉ correto o que se afirma em:"
A) I e II, apenas
B) I, II e III, apenas
C) II e IV, apenas
D) I, III e IV, apenas
E) I, II, III e IV

EXEMPLO 2 (Formato Caso/Situação):
Enunciado: "Um paciente de 67 anos, com insuficiência cardíaca congestiva classe III (NYHA), faz uso de furosemida 40 mg/dia, enalapril 20 mg/dia e carvedilol 25 mg 2x/dia. Procura a farmácia relatando câimbras frequentes, fraqueza muscular e palpitações. Os exames laboratoriais mostram potássio sérico de 2,8 mEq/L. Considerando o quadro clínico e os medicamentos em uso, qual a conduta farmacêutica mais adequada?"
A) Orientar o paciente a dobrar a dose de enalapril
B) Comunicar o médico e sugerir a suplementação de potássio ou associação com diurético poupador de potássio
C) Suspender a furosemida imediatamente
D) Recomendar o uso de anti-arrítmico sem prescrição médica
E) Substituir o carvedilol por outro betabloqueador

REGRAS:
- Enunciados detalhados com 4 a 12 linhas
- Alternativas plausíveis e homogêneas
- Dificuldade crescente conforme o ano do aluno
- Cada questão deve ter uma área temática/disciplina identificada
- Inclua explicação/justificativa para a resposta correta
- Questões interdisciplinares são bem-vindas

Use a tool "generate_questions" para retornar as questões.`;

  const userPrompt = `Gere ${totalQuestions} questões no estilo real do Teste de Progresso para o curso de ${course}.

Áreas temáticas prioritárias: ${subjectsList}
Dificuldade geral: ${difficulty || "variada"}

Distribuição por ano:
${yearEntries}

IMPORTANTE: Use formatos variados (afirmativas, asserção-razão, caso situacional, texto-base). Cada questão deve ter EXATAMENTE 5 alternativas (A, B, C, D, E).`;

  return { systemPrompt, userPrompt };
}

function buildToolSchema(isMedicine: boolean) {
  const optionProps: any = {
    a: { type: "string" },
    b: { type: "string" },
    c: { type: "string" },
    d: { type: "string" },
  };
  const optionRequired = ["a", "b", "c", "d"];
  const answerEnum = ["a", "b", "c", "d"];

  if (!isMedicine) {
    optionProps.e = { type: "string" };
    optionRequired.push("e");
    answerEnum.push("e");
  }

  return {
    type: "function" as const,
    function: {
      name: "generate_questions",
      description: "Generate progress test questions in Brazilian real exam style",
      parameters: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                expected_year: { type: "number", description: "Ano esperado (1-6)" },
                subject_area: { type: "string", description: "Área temática/disciplina da questão" },
                stem: { type: "string", description: "Enunciado completo com caso clínico ou texto-base" },
                options: { type: "object", properties: optionProps, required: optionRequired },
                correct_answer: { type: "string", enum: answerEnum },
                explanation: { type: "string", description: "Explicação/justificativa da resposta correta" },
                difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                bloom_level: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
              },
              required: ["expected_year", "subject_area", "stem", "options", "correct_answer", "difficulty", "tags"],
            },
          },
        },
        required: ["questions"],
      },
    },
  };
}

/* ────────────────────────────────────────────
   Main handler
   ──────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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

    const { testId, course, subjects, questionsPerYear, difficulty } = await req.json();

    if (!testId || !course || !subjects || !questionsPerYear) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: testId, course, subjects, questionsPerYear" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const yearEntries = Object.entries(questionsPerYear as Record<string, number>)
      .filter(([_, count]) => count > 0)
      .map(([year, count]) => `  - ${year}º ano: ${count} questões`)
      .join("\n");

    const totalQuestions = Object.values(questionsPerYear as Record<string, number>).reduce((s: number, n: number) => s + n, 0);
    const subjectsList = Array.isArray(subjects) ? subjects.join(", ") : subjects;

    const isMedicine = /medicina/i.test(course);
    const { systemPrompt, userPrompt } = isMedicine
      ? buildMedicinePrompt(totalQuestions, subjectsList, difficulty, yearEntries)
      : buildGenericPrompt(course, totalQuestions, subjectsList, difficulty, yearEntries);

    const { response, provider } = await callAiWithFallback(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [buildToolSchema(isMedicine)],
        tool_choice: { type: "function", function: { name: "generate_questions" } },
      },
      {
        userId: user.id,
        promptType: "generate-progress-test",
      },
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Adicione créditos nas configurações do workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI progress test error:", status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao gerar teste de progresso" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read as text first to handle encoding issues
    const rawResponseText = await response.text();
    let data: any;
    try {
      data = JSON.parse(rawResponseText);
    } catch (e) {
      console.error("Failed to parse AI response JSON:", e);
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract questions from tool call
    let questions: any[] = [];
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        let argsRaw = typeof toolCall.function.arguments === "string"
          ? toolCall.function.arguments
          : JSON.stringify(toolCall.function.arguments);

        // Fix broken multi-byte UTF-8 encoding artifacts from Gemini:
        // Accented chars (ô, ã, ç, ê, etc.) get replaced by \n\t+\n sequences
        argsRaw = argsRaw.replace(/\\n(?:\\t)+\\n/g, "");
        // Also handle already-decoded variants (literal newlines + tabs)
        argsRaw = argsRaw.replace(/\n\t+\n/g, "");

        const args = JSON.parse(argsRaw);
        questions = args.questions || [];
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    // Deep-clean all string values to remove any remaining encoding artifacts
    function cleanEncodingArtifacts(obj: any): any {
      if (typeof obj === "string") {
        return obj
          .replace(/\n\t{2,}\n/g, "")
          .replace(/\n {6,}\n/g, "")
          .replace(/\t{3,}/g, "");
      }
      if (Array.isArray(obj)) return obj.map(cleanEncodingArtifacts);
      if (obj && typeof obj === "object") {
        const cleaned: any = {};
        for (const [k, v] of Object.entries(obj)) {
          cleaned[k] = cleanEncodingArtifacts(v);
        }
        return cleaned;
      }
      return obj;
    }
    questions = cleanEncodingArtifacts(questions);

    if (questions.length === 0) {
      return new Response(JSON.stringify({ error: "A IA não gerou questões. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current max position
    const { data: existingQs } = await supabase
      .from("progress_test_questions")
      .select("position")
      .eq("test_id", testId)
      .order("position", { ascending: false })
      .limit(1);

    let nextPosition = (existingQs?.[0]?.position ?? -1) + 1;

    // Insert questions
    let insertedCount = 0;
    let skippedCount = 0;
    for (const q of questions) {
      const stem = q.stem || q.question_text || q.statement || "";
      if (!stem || !q.options || !q.correct_answer) {
        console.warn("Skipping incomplete question:", JSON.stringify(q).slice(0, 200));
        skippedCount++;
        continue;
      }

      const contentJson = {
        question_text: stem,
        stem: stem,
        statement: stem,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || "",
        subject_area: q.subject_area || "",
      };

      const tags = [...(q.tags || [])];
      if (q.subject_area && !tags.includes(q.subject_area)) {
        tags.unshift(q.subject_area);
      }

      const { data: inserted, error: insertError } = await supabase
        .from("question_bank")
        .insert({
          user_id: user.id,
          type: "multiple_choice",
          difficulty: q.difficulty || "medium",
          bloom_level: q.bloom_level || "understanding",
          tags,
          content_json: contentJson,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error("Failed to insert question:", insertError);
        continue;
      }

      const { error: linkError } = await supabase
        .from("progress_test_questions")
        .insert({
          test_id: testId,
          question_id: inserted.id,
          position: nextPosition,
          expected_year: q.expected_year || 1,
        });

      if (linkError) {
        console.error("Failed to link question:", linkError);
        continue;
      }

      nextPosition++;
      insertedCount++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalGenerated: questions.length,
        totalInserted: insertedCount,
        totalSkipped: skippedCount,
        provider,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generate-progress-test error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
