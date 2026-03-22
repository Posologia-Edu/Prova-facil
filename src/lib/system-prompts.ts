// Prompts de construção completos de cada ferramenta do ProvaFácil.
// Contém os prompts EXATOS usados nas Edge Functions e as instruções
// detalhadas de build para reproduzir cada módulo em outro projeto Lovable.
// Acesso exclusivo de administradores via SystemPromptViewer.

export interface SystemPromptEntry {
  id: string;
  label: string;
  description: string;
  edgeFunction: string;
  prompt: string;
}

export const SYSTEM_PROMPTS: Record<string, SystemPromptEntry[]> = {

  // ═══════════════════════════════════════════════════════════════
  // BANCO DE QUESTÕES
  // ═══════════════════════════════════════════════════════════════
  questions: [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir o Banco de Questões completo com geração por IA",
      edgeFunction: "generate-questions",
      prompt: `═══════════════════════════════════════════════════════════════
BANCO DE QUESTÕES — INSTRUÇÕES DE BUILD COMPLETAS
═══════════════════════════════════════════════════════════════

1. TABELA NO BANCO DE DADOS:
───────────────────────────
CREATE TABLE question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'multiple_choice',
    -- Tipos: multiple_choice, true_false, open_ended, matching
  content_json JSONB NOT NULL DEFAULT '{}',
    -- Estrutura varia por tipo:
    -- multiple_choice: { statement, options: [{text, isCorrect}], explanation }
    -- true_false: { statement, correctAnswer: true/false, explanation }
    -- open_ended: { statement, expectedAnswer, gradingCriteria }
    -- matching: { statement, column_a: [], column_b: [], correct_matches: {} }
  difficulty TEXT NOT NULL DEFAULT 'medium',
    -- Valores: easy, medium, hard
  bloom_level TEXT,
    -- Taxonomia de Bloom: Remembering, Understanding, Applying, Analyzing, Evaluating, Creating
  tags TEXT[],
  media_urls TEXT[],
  embed_url TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

RLS: Cada usuário vê apenas suas próprias questões (user_id = auth.uid()).
Soft-delete: deleted_at IS NULL para questões ativas.

2. PÁGINA DE LISTAGEM (Questions.tsx):
──────────────────────────────────────
- Grid de cards com questões agrupáveis por tags
- Filtros: tipo, dificuldade, bloom_level, tags, busca por texto
- Ações: criar manual, gerar com IA, editar, duplicar, excluir (soft-delete)
- Contagem de uso (quantas provas usam cada questão)
- Seleção múltipla para ações em lote

3. EDITOR DE QUESTÃO (inline ou dialog):
────────────────────────────────────────
- Campo de enunciado (statement) com suporte a Markdown
- Editor dinâmico por tipo:
  • Múltipla escolha: 4 opções com radio para marcar correta + campo de explicação
  • V/F: toggle true/false + explicação
  • Dissertativa: campo de resposta esperada + critérios de correção
  • Correspondência: duas colunas editáveis + mapeamento de pares
- Upload de mídia (imagens) via Supabase Storage
- Campo de URL de embed (vídeo/áudio)
- Seletor de dificuldade e nível de Bloom
- Editor de tags (input com chips)

4. GERAÇÃO POR IA (AIQuestionGenerator.tsx):
────────────────────────────────────────────
- Campos de input: tema, contexto/material, tipo, dificuldade, quantidade (1-10), idioma
- Botão "Gerar com IA" chama a edge function generate-questions
- Preview das questões geradas antes de salvar
- O usuário pode editar cada questão gerada antes de importar ao banco

5. EDGE FUNCTION — generate-questions:
──────────────────────────────────────
• Autenticação: verifica Bearer token com getClaims()
• Recebe: { topic, context, difficulty, questionType, count, language }
• Usa tool calling para garantir JSON estruturado
• Modelo padrão: google/gemini-3-flash-preview via callAiWithFallback

SYSTEM PROMPT EXATO:
"""
You are an expert academic question generator for university-level exams.
You generate high-quality, pedagogically sound questions.
You MUST respond using the "generate_questions" tool call. Do NOT respond with plain text.
You MUST generate ALL questions in {targetLang}. Every question text, option, explanation, and answer MUST be in {targetLang}.
"""

USER PROMPT EXATO:
"""
Generate {count} {questionType} questions about the topic: "{topic}".
Difficulty level: {difficulty}.
{context ? Additional context/material to base questions on: {context}}

{typeInstructions[questionType]}

For each question, also provide:
- "bloom_level": one of "Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"
- "tags": an array of 1-3 relevant topic tags
"""

TOOL CALL SCHEMA (múltipla escolha):
{
  "name": "generate_questions",
  "parameters": {
    "questions": [{
      "question_text": string,
      "options": { "a": string, "b": string, "c": string, "d": string },
      "correct_answer": "a" | "b" | "c" | "d",
      "explanation": string,
      "bloom_level": string,
      "tags": string[]
    }]
  }
}

Schemas similares existem para true_false, open_ended e matching.

6. IMPORTAÇÃO DE QUESTÕES (FormImportDialog):
──────────────────────────────────────────────
- Upload de arquivo JSON/CSV com questões
- Mapeamento de campos automático
- Validação antes de importar
- Suporte a importação do Marketplace

7. LIMITES DE USO (Free vs Premium):
─────────────────────────────────────
- Free: 5 questões geradas por IA/mês
- Premium: ilimitado
- Controle via tabela ai_usage_log + hook use-monthly-usage.ts
- O hook conta quantas gerações o usuário fez no mês corrente`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // COMPOSITOR DE PROVAS
  // ═══════════════════════════════════════════════════════════════
  exams: [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir o Compositor de Provas com correção por IA",
      edgeFunction: "grade-exam + ai-tutor-chat",
      prompt: `═══════════════════════════════════════════════════════════════
COMPOSITOR DE PROVAS — INSTRUÇÕES DE BUILD COMPLETAS
═══════════════════════════════════════════════════════════════

1. TABELAS NO BANCO DE DADOS:
─────────────────────────────
-- Provas
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT DEFAULT 'Nova Prova',
  description TEXT,
  status TEXT DEFAULT 'draft', -- draft, published, archived
  class_id UUID REFERENCES classes(id),
  header_config_json JSONB DEFAULT '{}',
    -- { institution, course, professor, date, semester, logo_url }
  layout_config_json JSONB DEFAULT '{}',
    -- { columns: 1|2, showPoints: true, fontSize: 'normal' }
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Questões vinculadas à prova
CREATE TABLE exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  question_id UUID REFERENCES question_bank(id),
  position INTEGER DEFAULT 0,
  points NUMERIC DEFAULT 1,
  section_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Publicações online
CREATE TABLE exam_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id),
  user_id UUID NOT NULL,
  access_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 6),
  time_limit_minutes INTEGER DEFAULT 60,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sessões de alunos
CREATE TABLE exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID REFERENCES exam_publications(id),
  student_name TEXT,
  student_email TEXT,
  student_id TEXT,
  status TEXT DEFAULT 'in_progress', -- in_progress, submitted, graded
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  total_score NUMERIC,
  max_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Respostas dos alunos
CREATE TABLE student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES exam_sessions(id),
  question_id UUID REFERENCES question_bank(id),
  answer_text TEXT,
  answer_json JSONB,
  points_earned NUMERIC,
  max_points NUMERIC DEFAULT 1,
  ai_score NUMERIC,
  ai_feedback TEXT,
  teacher_score NUMERIC,
  teacher_feedback TEXT,
  grading_status TEXT DEFAULT 'pending',
    -- pending, ai_graded, teacher_graded
  created_at TIMESTAMPTZ DEFAULT now()
);

2. EDITOR DE PROVA (ExamEditor.tsx):
────────────────────────────────────
- Drag-and-drop de questões do banco para a prova
- Seções nomeáveis (ex: "Parte I — Múltipla Escolha")
- Pontuação configurável por questão
- Cabeçalho institucional editável com logo upload
- Preview em tempo real
- Exportação em PDF (ExamPDFExporter.tsx usando jspdf + html2canvas)
- Botão "Publicar Online" que cria access_code de 6 dígitos

3. PORTAL DO ALUNO (StudentExam.tsx):
─────────────────────────────────────
- Acesso via PIN (access_code) + nome + e-mail
- Timer regressivo baseado em time_limit_minutes
- Uma questão por vez ou todas de uma vez (configurável)
- Correção automática de objetivas (client-side)
- Envio de dissertativas para correção por IA

4. EDGE FUNCTION — grade-exam:
──────────────────────────────
• Verifica que o chamador é o dono da prova (ownership check)
• Verifica assinatura Premium (Stripe ou admin_invitations)
• Filtra apenas respostas open_ended/matching com status "pending"
• Para cada resposta, chama a IA:

SYSTEM PROMPT EXATO:
"""
Você é um avaliador acadêmico justo e construtivo. Sempre responda em JSON válido.
"""

USER PROMPT EXATO:
"""
Você é um professor universitário avaliando a resposta de um aluno.

Questão (vale {maxPoints} pontos):
"{statement}"

Resposta do aluno:
"{answer_text}"

Avalie a resposta do aluno e forneça:
1. Uma nota de 0 a {maxPoints} (pode usar decimais com uma casa, ex: 3.5)
2. Uma justificativa breve (2-3 frases) explicando a nota

Responda APENAS no formato JSON:
{"score": <número>, "feedback": "<justificativa>"}
"""

• Atualiza student_answers com ai_score, ai_feedback, grading_status = "ai_graded"
• Recalcula total_score da sessão

5. EDGE FUNCTION — ai-tutor-chat:
─────────────────────────────────
• Chat com streaming (SSE) para discussão professor-IA sobre uma resposta
• Dois modos: "grade" (avaliação inicial) e "chat" (discussão)
• Contexto completo: questão, resposta do aluno, notas da IA e do professor

SYSTEM PROMPT EXATO:
"""
Você é um Tutor de IA especializado em avaliação acadêmica. Seu papel é auxiliar o professor na correção de provas, dando feedback detalhado e discutindo critérios de avaliação.

CONTEXTO DA QUESTÃO:
- Tipo: {questionType}
- Enunciado: "{statement}"
- Pontuação máxima: {maxPoints} pontos
- {expectedAnswer}

RESPOSTA DO ALUNO:
"{studentAnswer}"

AVALIAÇÃO ATUAL:
- Nota da IA: {ai_score}
- Feedback da IA: {ai_feedback}
- Nota do professor: {teacher_score}
- Feedback do professor: {teacher_feedback}
- Status: {grading_status}

INSTRUÇÕES:
[modo grade] Avalie a resposta do aluno de forma justa e construtiva. Forneça nota sugerida, justificativa pedagógica, pontos positivos e negativos, sugestão de feedback.
[modo chat] Você está em modo de discussão com o professor. Responda de forma construtiva e fundamentada.
"""

6. MONITORAMENTO (ExamMonitoring.tsx):
──────────────────────────────────────
- Dashboard com sessões em tempo real (Realtime do Supabase)
- Status: em andamento, enviada, corrigida
- Painel de correção com notas IA vs professor
- Exportação de resultados em CSV
- Estatísticas por questão (taxa de acerto, média)`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // PACIENTES VIRTUAIS
  // ═══════════════════════════════════════════════════════════════
  "virtual-patients": [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir os Pacientes Virtuais com 10 cenários clínicos",
      edgeFunction: "virtual-patient-chat + grade-virtual-patient",
      prompt: `═══════════════════════════════════════════════════════════════
PACIENTES VIRTUAIS — INSTRUÇÕES DE BUILD COMPLETAS
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
- 10 pacientes pré-configurados (5 Dor + 5 Inflamação)
- 3 encontros progressivos por paciente:
  • Encontro 1: Anamnese + prescrição inicial
  • Encontro 2: Retorno com exames + evolução
  • Encontro 3: Ajustes + preenchimento do MAI
- O aluno conversa via chat com a IA que simula o paciente
- Ao final, a IA corrige com rubrica de 0-10

2. TABELAS:
───────────
-- Vinculo turma-paciente
CREATE TABLE class_virtual_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id),
  patient_id TEXT NOT NULL, -- ex: pain_helena, inflammation_maria
  access_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 6),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sessões
CREATE TABLE virtual_patient_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_virtual_patient_id UUID REFERENCES class_virtual_patients(id),
  student_name TEXT,
  student_email TEXT,
  group_id UUID, -- para modo grupo
  current_encounter INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mensagens do chat
CREATE TABLE virtual_patient_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES virtual_patient_sessions(id),
  role TEXT NOT NULL, -- 'user' ou 'assistant'
  content TEXT NOT NULL,
  encounter INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MAI (Medication Appropriateness Index)
CREATE TABLE virtual_patient_mai_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES virtual_patient_sessions(id),
  mai_json JSONB NOT NULL, -- array de medicamentos com critérios MAI
  total_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notas da IA
CREATE TABLE virtual_patient_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES virtual_patient_sessions(id),
  class_virtual_patient_id UUID,
  subscores JSONB, -- { anamnese, plano_inicial, exames, reavaliacao_ajustes, mai }
  bonus_penalidades JSONB,
  nota_final NUMERIC,
  nota_microlearning NUMERIC,
  feedback_resumido TEXT,
  orientacoes_melhoria TEXT,
  flags_seguranca JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

3. EDGE FUNCTION — virtual-patient-chat:
────────────────────────────────────────
• Recebe: { patientId, messages, encounter }
• Seleciona o prompt do paciente pelo patientId
• Adiciona contexto de encontro (1, 2 ou 3)
• Modelo: google/gemini-3-flash-preview

PACIENTES CADASTRADOS (10):
─ DOR: pain_helena, pain_luciana, pain_rogerio, pain_pedro, pain_ana
─ INFLAMAÇÃO: inflammation_maria, inflammation_antonio, inflammation_renata, inflammation_wilson, inflammation_jose

EXEMPLO DE PROMPT COMPLETO (Dona Helena — Dor Neuropática Pós-Herpética):
"""
Você é Dona Helena, 67 anos, viúva, ex-professora de história. Peso: 68 kg, Altura: 1,62 m. Nega alergias medicamentosas. Histórico familiar: mãe faleceu de AVC aos 75 anos. Não fuma, não bebe. Sedentária. Adesão: às vezes esquece a losartana à noite. Sinais vitais: PA 138/82 mmHg, FC 72 bpm, Temp 36,4°C. Expectativa: "Quero voltar a dormir bem e usar minhas roupas sem dor."

Simule uma consulta em 3 momentos. Responda sempre como paciente, não ofereça condutas médicas.

Enquanto o estudante fizer perguntas de anamnese ou sugerir tratamentos/exames, mantenha-se no Momento 1. Quando o estudante disser que terminou a avaliação inicial ou pedir para ver a evolução, avance para o Momento 2. Quando ele sugerir ajustes no tratamento, avance para o Momento 3.

REGRAS GERAIS DO PACIENTE VIRTUAL:
1. Nunca entregue todas as informações de forma espontânea. Responda de forma breve e incompleta, como um paciente real faria. Só forneça detalhes se o estudante perguntar diretamente.
2. No Momento 1: Comece apenas cumprimentando e dizendo que tem um incômodo geral. Espere as perguntas.
3. No Momento 2: Traga apenas os exames que o estudante solicitou. Relate evolução clínica apenas em relação aos tratamentos propostos.
4. No Momento 3: Relate a resposta aos ajustes feitos pelo estudante, nada além. Espere o estudante explorar com perguntas.
5. Mantenha linguagem de paciente leigo: termos simples, dúvidas, inseguranças.

REGRAS PARA EXAMES:
- Se pedir exame específico, forneça resultado numérico completo. Se pedir "todos os exames", responda: "Quais exames o doutor gostaria que eu trouxesse? Eu não lembro de todos."
- Nunca responda "não lembro" ou "não sei" sobre exames. Sempre forneça valores numéricos.
- Se pedir exame não previsto, invente resultado coerente com a condição clínica.

EXAME FÍSICO: Se perguntar → dor à palpação em região torácica direita (dermátomo T4-T6), alodinia ao toque leve, cicatrizes residuais de vesículas herpéticas. Sem alterações cardiopulmonares.

Momento 1 (anamnese inicial):
- Queixa: dor em queimadura no lado direito do tórax desde herpes zoster há 6 meses.
- Dor contínua 7/10, pior à noite, sensação de choque ao toque da roupa.
- Já tentou paracetamol e ibuprofeno sem melhora.
- Medicamento em uso: losartana 50 mg/dia (1x manhã).
- Antecedente: hipertensão controlada.
- Impacto: insônia, dificuldade para vestir roupas, humor deprimido.

Momento 2 (retorno):
- Paracetamol/AINEs → sem melhora significativa.
- Gabapentina/pregabalina → melhora parcial da dor, mas sonolência.
- Antidepressivo tricíclico/ISRS/IRSN → melhora parcial, mas boca seca/constipação.
- Opioide → melhora moderada, mas náusea.
- Condutas não farmacológicas → leve melhora.
- Exames: hemograma normal (Hb 13,2 g/dL, Leuco 5.800/mm³, Plaq 245.000/mm³), função renal normal (ureia 32 mg/dL, creatinina 0,8 mg/dL), glicemia limítrofe 118 mg/dL.

Momento 3 (ajustes finais):
- Se aumentaram dose → melhora extra, mas mais efeitos adversos.
- Se trocaram classe → melhora global maior, menos efeitos adversos.
- Se não mudaram → dor estável (6/10).
- Finalize dizendo: "Será que esse tratamento agora está realmente adequado para mim?"

Respostas abertas:
- Carbamazepina → melhora parcial + tontura.
- Omeprazol → ausência de melhora.
- Vitamina B12 → normal (450 pg/mL). TSH → normal (2,1 mUI/L). Função hepática → TGO 22 U/L, TGP 18 U/L (normais).
"""

[Os outros 9 pacientes seguem a MESMA estrutura. Cada um com:
 - Dados demográficos completos
 - Sinais vitais
 - Exame físico
 - 3 momentos com respostas condicionais
 - Respostas abertas para exames/medicamentos não previstos]

CONTEXTO DE ENCONTRO (adicionado automaticamente):
- Encontro 2: "[CONTEXTO DO SISTEMA: O paciente retorna para o SEGUNDO ENCONTRO...]"
- Encontro 3: "[CONTEXTO DO SISTEMA: O paciente retorna para o TERCEIRO e último ENCONTRO...]"

4. EDGE FUNCTION — grade-virtual-patient:
─────────────────────────────────────────
• Recebe: { session_id, class_virtual_patient_id }
• Busca todas as mensagens da sessão + MAI preenchido
• Monta transcript formatado: [Encontro X] ESTUDANTE/PACIENTE: conteúdo
• Modelo: google/gemini-2.5-pro (para qualidade de correção)

SYSTEM PROMPT EXATO:
"""
Você é um avaliador objetivo para a disciplina Farmacologia Aplicada.

Sua tarefa é ler o TRANSCRIPT do aluno com o paciente virtual e o RESUMO FINAL do aluno, e emitir NOTA e FEEDBACK conforme a RUBRICA abaixo.

RUBRICA (0–10):

1) Anamnese estruturada (0–2) → queixa principal, HDA, comorbidades, medicações, impacto funcional/sono.
2) Plano inicial coerente (0–2) → farmacológico adequado + não farmacológico, com lógica e justificativa.
3) Exames e justificativa (0–2) → pertinência dos exames solicitados e explicação de relevância.
4) Reavaliação e ajustes (0–2) → interpretação da evolução clínica + ajustes corretos de conduta.
5) MAI consistente (0–2) → aplicação crítica do Medication Appropriateness Index.

BÔNUS/PENALIDADES (±1 no máximo):
+0,5 → integra risco/benefício e preferências do paciente.
–0,5 → erro de segurança relevante (ex.: AINE sistêmico em DRC, opioide sem manejo de efeitos adversos).
–0,5 → ignorar dados novos trazidos na evolução.

REGRAS:
- Seja conciso, específico e objetivo.
- Sempre devolva um JSON válido seguindo o SCHEMA abaixo.
- Cite pequenas evidências do transcript quando possível ("o aluno disse…").
- Se faltar informação, penalize justificando.
- Se houver erro grave de segurança, liste em flags_seguranca.

SCHEMA DE SAÍDA (JSON):
{
  "subscores": {
    "anamnese": 0.0,
    "plano_inicial": 0.0,
    "exames": 0.0,
    "reavaliacao_ajustes": 0.0,
    "mai": 0.0
  },
  "bonus_penalidades": {
    "integracao_risco_beneficio_preferencias": 0.0,
    "erro_seguranca": 0.0,
    "ignorou_dados_evolucao": 0.0
  },
  "nota_final_0a10": 0.0,
  "nota_microlearning_0a5": 0.0,
  "feedback_resumido": "3-5 bullets curtos",
  "orientacoes_melhoria": "lista curta de ações práticas",
  "flags_seguranca": []
}

CÁLCULO:
- Some os 5 itens (0–10), aplique bônus/penalidades sem ultrapassar 10.
- Converta para microlearning (0–5) dividindo por 2 (arredonde para 0,1).
"""

5. MAI (VirtualPatientMAI.tsx):
──────────────────────────────
- Formulário para N medicamentos (dinâmico)
- Cada medicamento tem 10 critérios do MAI:
  1. Indicação, 2. Efetividade, 3. Dose, 4. Posologia, 5. Instruções de uso,
  6. Interações medicamentosas, 7. Interações com doença, 8. Duplicidade,
  9. Duração do tratamento, 10. Custo-efetividade
- Cada critério: Adequado (1) / Não adequado (0) / Não se aplica
- Score total = soma / possível × 100

6. ANALYTICS (VPAnalytics.tsx):
───────────────────────────────
- Dashboard com histograma de notas da turma
- Radar de desempenho nos 5 critérios da rubrica
- Ranking de erros de segurança (flags_seguranca)
- Correção em lote de toda a turma com um clique
- Detalhamento por aluno com chat transcript`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // OSCE
  // ═══════════════════════════════════════════════════════════════
  osce: [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir o módulo OSCE completo com circuitos, checklists e paciente virtual",
      edgeFunction: "generate-osce-station + osce-virtual-patient",
      prompt: `═══════════════════════════════════════════════════════════════
OSCE — INSTRUÇÕES DE BUILD COMPLETAS
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
OSCE = Objective Structured Clinical Examination
- Exame com N estações clínicas em circuito
- Cada estação: cenário + paciente simulado + checklist de avaliação
- Alunos rodizam pelas estações com timer
- Avaliadores preenchem checklists em tempo real
- Suporte a paciente virtual por IA em estações online

2. TABELAS:
───────────
-- Exames OSCE
CREATE TABLE osce_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT DEFAULT 'Novo OSCE',
  description TEXT,
  station_duration_minutes INTEGER DEFAULT 8,
  transition_seconds INTEGER DEFAULT 60,
  is_online BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft',
  class_id UUID REFERENCES classes(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Estações
CREATE TABLE osce_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  osce_exam_id UUID REFERENCES osce_exams(id),
  position INTEGER DEFAULT 0,
  title TEXT DEFAULT 'Nova Estação',
  student_instructions TEXT, -- instruções na porta
  case_summary TEXT, -- caso clínico para avaliador
  patient_script TEXT, -- roteiro do paciente simulado
  is_rest_station BOOLEAN DEFAULT false,
  learning_objectives TEXT[],
  duration_minutes INTEGER,
  virtual_patient_enabled BOOLEAN DEFAULT false,
  virtual_patient_system_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Itens do checklist
CREATE TABLE osce_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES osce_stations(id),
  position INTEGER DEFAULT 0,
  description TEXT NOT NULL,
  type TEXT DEFAULT 'binary', -- binary, likert, score
  likert_max INTEGER DEFAULT 5,
  max_points INTEGER DEFAULT 1,
  weight NUMERIC DEFAULT 1,
  is_critical BOOLEAN DEFAULT false,
  category TEXT, -- Comunicação, Raciocínio Clínico, Domínio Técnico, Empatia, Ética, Geral
);

-- Avaliadores por estação
CREATE TABLE osce_station_evaluators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES osce_stations(id),
  evaluator_name TEXT,
  evaluator_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Materiais por estação
CREATE TABLE osce_station_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES osce_stations(id),
  title TEXT,
  type TEXT DEFAULT 'text', -- text, image, pdf
  content TEXT,
  file_url TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Circuitos (execução)
CREATE TABLE osce_circuits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  osce_exam_id UUID REFERENCES osce_exams(id),
  user_id UUID NOT NULL,
  access_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 6),
  status TEXT DEFAULT 'waiting', -- waiting, running, paused, finished
  current_rotation INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  class_id UUID REFERENCES classes(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Alunos no circuito
CREATE TABLE osce_circuit_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id UUID REFERENCES osce_circuits(id),
  student_name TEXT,
  student_email TEXT,
  student_registration TEXT,
  current_station_id UUID REFERENCES osce_stations(id),
  current_rotation INTEGER DEFAULT 0,
  status TEXT DEFAULT 'waiting',
  station_entered_at TIMESTAMPTZ,
  visited_stations TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Avaliações
CREATE TABLE osce_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id UUID REFERENCES osce_circuits(id),
  station_id UUID REFERENCES osce_stations(id),
  student_name TEXT,
  student_email TEXT,
  evaluator_id UUID,
  rotation INTEGER DEFAULT 0,
  total_score NUMERIC,
  max_score NUMERIC,
  passed BOOLEAN,
  observations TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Itens da avaliação
CREATE TABLE osce_evaluation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID REFERENCES osce_evaluations(id),
  checklist_item_id UUID REFERENCES osce_checklist_items(id),
  value INTEGER DEFAULT 0,
  notes TEXT
);

-- Mensagens de chat (paciente virtual OSCE)
CREATE TABLE osce_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id UUID REFERENCES osce_circuits(id),
  station_id UUID REFERENCES osce_stations(id),
  student_id UUID REFERENCES osce_circuit_students(id),
  role TEXT DEFAULT 'user',
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

3. EDGE FUNCTION — generate-osce-station:
─────────────────────────────────────────
SYSTEM PROMPT EXATO:
"""
Você é um especialista em avaliações OSCE na área de {area}. Nível: {level}.
Gere uma estação OSCE completa com base no contexto e objetivos fornecidos.
O cenário deve ser realista, detalhado e adequado para avaliação prática.
O roteiro do paciente simulado deve incluir: personalidade, sintomas, informações que só revela se perguntado, e dados biográficos relevantes.
O prompt do paciente virtual deve ser instruções claras para um chatbot de IA agir como o paciente.
O checklist deve cobrir as categorias: Comunicação, Raciocínio Clínico, Domínio Técnico e Empatia.
Inclua itens críticos que reprovam se não realizados.
"""

TOOL CALL: create_osce_station com fields:
  title, student_instructions, case_summary, patient_script,
  virtual_patient_system_prompt, learning_objectives,
  checklist_items[{ description, type, likert_max, weight, is_critical, category }]

4. EDGE FUNCTION — osce-virtual-patient:
────────────────────────────────────────
• Busca estação pelo stationId
• Usa virtual_patient_system_prompt configurado ou fallback:

FALLBACK PROMPT:
"""
Você é um paciente simulado em uma avaliação OSCE. Estação: {title}.
Siga estritamente este roteiro: {patient_script}
Responda como o paciente descrito. Não saia do personagem. Responda de forma natural e realista.
Só revele informações quando perguntado diretamente. Mantenha a consistência das respostas.
"""

5. CIRCUITO E TIMER:
────────────────────
- Professor inicia circuito → status = "running"
- Timer global baseado em station_duration_minutes + transition_seconds
- A cada rotação: alunos avançam para próxima estação
- Estações de descanso (is_rest_station) não têm avaliação
- Tudo via Supabase Realtime (subscribe em osce_circuits e osce_circuit_students)

6. AVALIADOR (OsceEvaluator.tsx):
─────────────────────────────────
- Acesso por e-mail cadastrado na estação
- Checklist interativo: binary (toggle), likert (slider 1-N), score (input numérico)
- Itens críticos destacados em vermelho
- Campo de observações livres
- Score calculado: Σ(value × weight)`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // JÚRI SIMULADO
  // ═══════════════════════════════════════════════════════════════
  "mock-trials": [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir o Júri Simulado com geração de processos por IA",
      edgeFunction: "generate-mock-trial",
      prompt: `═══════════════════════════════════════════════════════════════
JÚRI SIMULADO — INSTRUÇÕES DE BUILD COMPLETAS
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
- Professor configura um cenário de júri clínico
- IA gera processo jurídico completo (ou professor faz upload de PDF)
- Alunos são divididos em grupos (defesa, acusação, jurados)
- Cada grupo recebe personagens-testemunha com instruções
- Juiz (professor) conduz as fases do julgamento

2. TABELAS:
───────────
CREATE TABLE mock_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT DEFAULT 'Novo Júri Simulado',
  description TEXT,
  judge_name TEXT,
  access_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 6),
  status TEXT DEFAULT 'draft',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mock_trial_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_trial_id UUID REFERENCES mock_trials(id),
  title TEXT,
  case_number TEXT,
  process_content TEXT, -- Markdown do processo completo
  characters_json JSONB, -- [{ side, name, profession, instructions }]
  learning_objectives TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mock_trial_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_trial_id UUID REFERENCES mock_trials(id),
  name TEXT,
  group_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mock_trial_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES mock_trial_groups(id),
  student_name TEXT,
  student_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mock_trial_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES mock_trial_groups(id),
  case_id UUID REFERENCES mock_trial_cases(id),
  role TEXT DEFAULT 'juror', -- defense, prosecution, juror
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mock_trial_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_trial_id UUID REFERENCES mock_trials(id),
  title TEXT,
  target_role TEXT, -- defense, prosecution, juror, all
  fields_json JSONB, -- campos do formulário
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mock_trial_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES mock_trial_cases(id),
  status TEXT DEFAULT 'waiting',
    -- waiting, opening_statements, witness_examination, debate, deliberation, verdict, finished
  judge_notes TEXT,
  current_phase_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mock_trial_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES mock_trial_sessions(id),
  form_id UUID REFERENCES mock_trial_forms(id),
  group_id UUID REFERENCES mock_trial_groups(id),
  student_name TEXT,
  student_email TEXT,
  response_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

3. EDGE FUNCTION — generate-mock-trial:
───────────────────────────────────────
• Recebe: { learningObjectives, pdfBase64, pdfContent, caseNumber }
• Se PDF enviado: extrai texto via Gemini (multimodal)
• Modelo: google/gemini-3-flash-preview

SYSTEM PROMPT EXATO:
"""
Você é um especialista em educação médica e simulações jurídicas clínicas. Você cria processos jurídicos simulados para fins educacionais em saúde.

Gere um processo jurídico simulado completo no seguinte formato JSON:

{
  "title": "Título do caso (nome do paciente fictício)",
  "process_content": "Texto completo do processo em Markdown incluindo: Cabeçalho do Tribunal, Número do Processo, Ação Penal, Relato dos Fatos, Fundamentação Jurídica, Denúncia, Lista de Provas, Anexo 1 (Depoimento do Médico), Anexo 2 (Prontuário Médico), Anexo 3 (Laudo Pericial), Anexo 4 (Depoimento do Paciente), Anexo 5 (Laudos de Exames)",
  "characters": [
    {
      "side": "defense",
      "name": "Nome completo",
      "profession": "Especialidade médica",
      "instructions": "Instruções detalhadas para a testemunha de defesa"
    },
    {
      "side": "prosecution",
      "name": "Nome completo",
      "profession": "Especialidade médica",
      "instructions": "Instruções detalhadas para a testemunha de acusação"
    }
  ]
}

O processo deve:
- Ser realista e educativo
- Conter detalhes clínicos suficientes para discussão
- Ter fundamentação jurídica baseada no Código Penal e Código de Ética Médica
- Gerar personagens-testemunha com profissões relacionadas ao caso
"""

4. FLUXO DO JUIZ (MockTrialJudge.tsx):
──────────────────────────────────────
- Acessa via /mock-trial/judge/:accessCode
- Controla fases: abertura → inquirição → debate → deliberação → veredicto
- Timer por fase com Realtime sync
- Notas do juiz em tempo real
- Os alunos veem a fase atual e timer via Realtime

5. PORTAL DO ALUNO (MockTrialStudent.tsx):
──────────────────────────────────────────
- Acessa via Portal do Aluno com PIN
- Vê o processo, seu papel e personagens designados
- Preenche formulários conforme a fase (respostas salvas em mock_trial_responses)
- Timer sincronizado com o juiz`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // SIMULAÇÃO REALÍSTICA
  // ═══════════════════════════════════════════════════════════════
  simulations: [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir a Simulação Realística com distribuição de papéis e fluxo integrado",
      edgeFunction: "N/A (lógica client-side)",
      prompt: `═══════════════════════════════════════════════════════════════
SIMULAÇÃO REALÍSTICA — INSTRUÇÕES DE BUILD COMPLETAS
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
- Sala de simulação com pares de alunos
- Papéis: Profissional de Saúde, Paciente, Observador
- Rodadas com rotação automática de papéis
- Materiais (scripts) entregues conforme o papel
- Fluxo integrado: Simulação → SOAP → Reconciliação → Documentação

2. TABELAS:
───────────
CREATE TABLE simulation_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  description TEXT,
  access_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 6),
  status TEXT DEFAULT 'waiting',
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 3,
  class_id UUID REFERENCES classes(id),
  materials_json JSONB, -- materiais por papel/ciclo
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE simulation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES simulation_rooms(id),
  student_name TEXT,
  student_email TEXT,
  pair_index INTEGER DEFAULT 0,
  current_role TEXT, -- professional, patient, observer
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT now()
);

3. DISTRIBUIÇÃO DE PAPÉIS (simulation-distribution.ts):
───────────────────────────────────────────────────────
- Alunos são numerados por ordem de entrada
- Divididos em pares (pair_index = floor(position / 2))
- Para N alunos:
  • Se N é par: N/2 pares, cada par = profissional + paciente
  • Se N é ímpar: último aluno é observador fixo ou rodízio especial
- A cada rodada:
  • Profissional ↔ Paciente (inversão de papéis dentro do par)
  • Observador rotaciona entre pares

4. MATERIAIS (simulation-materials.ts):
───────────────────────────────────────
- Configuráveis por papel e por ciclo/rodada
- O paciente recebe o script do caso clínico
- O profissional recebe briefing geral
- O observador recebe checklist de avaliação

5. CONTROLE (SimulationControl.tsx):
────────────────────────────────────
- Professor vê grid com todos os pares e papéis
- Botão "Próxima Rodada" avança e redistribui papéis
- Timer por rodada
- Realtime: participantes veem mudança de papel instantaneamente

6. PORTAL DO ALUNO (SimulationJoin.tsx):
────────────────────────────────────────
- Acessa via PIN + nome + e-mail
- Vê seu papel atual e materiais correspondentes
- Atualiza em tempo real quando professor avança rodada`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // SOAP
  // ═══════════════════════════════════════════════════════════════
  soap: [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir o módulo SOAP com formulários customizáveis",
      edgeFunction: "grade-reconciliation (reutilizado)",
      prompt: `═══════════════════════════════════════════════════════════════
SOAP — INSTRUÇÕES DE BUILD COMPLETAS
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
S — SUBJETIVO: Queixa principal, HDA, revisão de sistemas
O — OBJETIVO: Sinais vitais, exame físico, resultados
A — AVALIAÇÃO: Diagnósticos, raciocínio clínico
P — PLANO: Terapêutica, exames, encaminhamentos

- Vincula com Sala de Simulação (herda participantes e pares)
- Pares preenchem formulários SOAP
- Correção por IA ou professor

2. TABELAS:
───────────
CREATE TABLE soap_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  description TEXT,
  access_code TEXT UNIQUE,
  simulation_room_id UUID REFERENCES simulation_rooms(id),
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE soap_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES soap_rooms(id),
  student_name TEXT,
  student_email TEXT,
  pair_index INTEGER DEFAULT 0,
  pair_position TEXT, -- 'A' ou 'B'
  participant_role TEXT DEFAULT 'student',
  simulation_participant_id UUID, -- vínculo com simulação
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE soap_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES soap_rooms(id),
  title TEXT,
  form_type TEXT DEFAULT 'soap',
  content_json JSONB, -- campos do formulário com max_score e answer_key
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE soap_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES soap_rooms(id),
  form_id UUID REFERENCES soap_forms(id),
  pair_index INTEGER DEFAULT 0,
  answers_json JSONB,
  ai_score NUMERIC,
  ai_feedback_json JSONB,
  admin_score NUMERIC,
  admin_feedback TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

3. FORMULÁRIOS CUSTOMIZÁVEIS (FormBuilder.tsx):
───────────────────────────────────────────────
- Tipos de campo: text, textarea, number, select, radio, checkbox, scale
- Cada campo tem: id, label, type, required, max_score, answer_key
- O professor configura o espelho de respostas (answer_key)
- Drag-and-drop para reordenar campos

4. VINCULAÇÃO COM SIMULAÇÃO:
────────────────────────────
- Ao criar sala SOAP, selecionar sala de simulação existente
- Participantes e pares são herdados automaticamente
- O fluxo segue: Simulação → SOAP → Reconciliação → Documentação`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // RECONCILIAÇÃO MEDICAMENTOSA
  // ═══════════════════════════════════════════════════════════════
  reconciliation: [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir a Reconciliação Medicamentosa com correção por IA",
      edgeFunction: "grade-reconciliation",
      prompt: `═══════════════════════════════════════════════════════════════
RECONCILIAÇÃO MEDICAMENTOSA — INSTRUÇÕES DE BUILD COMPLETAS
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
- Duplas de alunos analisam medicações de um caso clínico
- Preenchem formulário de reconciliação (campos customizáveis)
- IA compara respostas com espelho do professor e atribui nota + feedback

2. TABELAS: reconciliation_rooms, reconciliation_participants,
   reconciliation_forms, reconciliation_responses,
   reconciliation_clinical_cases
   (mesma estrutura do SOAP, vincula com soap_rooms)

3. EDGE FUNCTION — grade-reconciliation:
────────────────────────────────────────
• Recebe: { response_id, room_id, answers_json, answer_key_json, form_fields }
• Monta prompt comparando cada campo do aluno com o espelho

SYSTEM PROMPT EXATO:
"""
Você é um avaliador acadêmico de saúde. Avalie as respostas dos alunos comparando com o espelho de respostas fornecido pelo professor.
Para cada item, forneça uma nota (de 0 até o máximo de pontos) e um feedback construtivo em português.
Retorne o resultado usando a função fornecida.
"""

TOOL CALL: submit_grading com:
  items[{ field_id, score, feedback }], total_score, general_feedback

• Salva ai_score e ai_feedback_json na tabela reconciliation_responses`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENTAÇÃO CLÍNICA
  // ═══════════════════════════════════════════════════════════════
  documentation: [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir a Documentação Clínica com fichas de encaminhamento e quadro de medicamentos",
      edgeFunction: "grade-documentation",
      prompt: `═══════════════════════════════════════════════════════════════
DOCUMENTAÇÃO CLÍNICA — INSTRUÇÕES DE BUILD COMPLETAS
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
- Último módulo do fluxo integrado (Simulação → SOAP → Reconciliação → Documentação)
- Dois formulários:
  • Ficha de Encaminhamento (0 a 5 pontos)
  • Quadro Resumo de Medicamentos (0 a 5 pontos)
- Nota total: soma das duas (máx 10 pontos)
- Correção por IA comparando com espelho

2. TABELAS: documentation_rooms, documentation_participants,
   documentation_forms, documentation_responses,
   documentation_clinical_cases
   (vincula com reconciliation_rooms)

3. EDGE FUNCTION — grade-documentation:
───────────────────────────────────────

SYSTEM PROMPT EXATO:
"""
Você é um avaliador acadêmico de saúde. Avalie as respostas dos alunos comparando com o espelho de respostas.
A nota do módulo de Documentação é dividida em duas partes:
- Ficha de Encaminhamento: nota de 0 a 5,0 pontos
- Quadro Resumo de Medicamentos: nota de 0 a 5,0 pontos
- Nota total: soma das duas, máximo 10,0 pontos

Para cada item do encaminhamento, dê uma nota proporcional e feedback em português.
Para o quadro resumo, avalie cada linha comparando com o espelho.
Retorne usando a função fornecida. Garanta que referral_total <= 5.0 e medication_score <= 5.0.
"""

TOOL CALL: submit_grading com:
  referral_items[{ field_id, score, feedback }],
  referral_total (0-5),
  medication_score (0-5),
  medication_feedback,
  general_feedback,
  total_score (0-10)

4. QUADRO DE MEDICAMENTOS:
──────────────────────────
- Tabela editável com colunas customizáveis
- Cada linha = 1 medicamento
- Colunas típicas: Nome, Dose, Via, Frequência, Indicação, Observações
- Score por linha configurável
- O espelho tem answer_rows que a IA compara com as student_rows`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // SCT (Script Concordance Test)
  // ═══════════════════════════════════════════════════════════════
  sct: [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir o SCT com painel de especialistas e pontuação agregada",
      edgeFunction: "student-exam-access (lógica client-side)",
      prompt: `═══════════════════════════════════════════════════════════════
SCT (Script Concordance Test) — INSTRUÇÕES DE BUILD COMPLETAS
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
O SCT avalia raciocínio clínico sob incerteza. NÃO tem gabarito absoluto.
A "resposta correta" é derivada estatisticamente de um painel de especialistas.

Cada cenário apresenta:
  - Uma vinheta clínica
  - Uma hipótese (diagnóstica, investigativa ou terapêutica)
  - Uma nova informação clínica
  - Escala Likert de -2 a +2 (muito menos provável → muito mais provável)

2. TABELAS:
───────────
CREATE TABLE sct_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  description TEXT,
  expert_panel_size INTEGER DEFAULT 10,
  status TEXT DEFAULT 'draft',
  class_id UUID REFERENCES classes(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sct_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sct_exam_id UUID REFERENCES sct_exams(id),
  clinical_vignette TEXT,
  hypothesis TEXT,
  new_information TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sct_expert_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES sct_scenarios(id),
  expert_name TEXT,
  expert_email TEXT,
  likert_value INTEGER, -- -2 a +2
  created_at TIMESTAMPTZ DEFAULT now()
);

3. PONTUAÇÃO AGREGADA (lógica client-side):
───────────────────────────────────────────
Para cada cenário:
  1. Calcular distribuição de respostas do painel de especialistas
  2. Score do aluno = frequência relativa da sua resposta no painel

Exemplo: 10 especialistas responderam ao cenário X:
  -2: 0 experts, -1: 1 expert, 0: 1 expert, +1: 8 experts, +2: 0 experts
  → Aluno marcou +1 → score = 8/8 = 1.0 (normalizado pelo máximo)
  → Aluno marcou -1 → score = 1/8 = 0.125

Score final = (soma dos scores / nº de cenários) × 100

4. PORTAL DO ESPECIALISTA (SctExpertPortal.tsx):
────────────────────────────────────────────────
- Acesso via código do exame
- Responde cada cenário na escala Likert
- Suas respostas alimentam o painel de referência

5. PORTAL DO ALUNO (SctStudentPortal.tsx):
──────────────────────────────────────────
- Responde os mesmos cenários
- Ao final, recebe score baseado na concordância com o painel`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // KFE (Key Feature Exam)
  // ═══════════════════════════════════════════════════════════════
  kfe: [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir o KFE com casos clínicos progressivos e decisões-chave",
      edgeFunction: "student-exam-access (lógica client-side)",
      prompt: `═══════════════════════════════════════════════════════════════
KFE (Key Feature Exam) — INSTRUÇÕES DE BUILD COMPLETAS
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
O KFE avalia a capacidade de tomar decisões-chave em momentos críticos de um caso clínico.
O aluno NÃO pode voltar a um caso anterior (fluxo sequencial, irreversível).

2. TABELAS:
───────────
CREATE TABLE kfe_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'draft',
  class_id UUID REFERENCES classes(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE kfe_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kfe_exam_id UUID REFERENCES kfe_exams(id),
  title TEXT,
  clinical_scenario TEXT, -- cenário progressivo em Markdown
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE kfe_key_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES kfe_cases(id),
  question_text TEXT,
  question_type TEXT DEFAULT 'multiple_choice',
    -- multiple_choice, multiple_select, dropdown, short_text
  options_json JSONB, -- [{ value, label }]
  correct_answer_json JSONB,
  explanation TEXT,
  max_score NUMERIC DEFAULT 1,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE kfe_sessions / kfe_answers (sessão e respostas do aluno)

3. CORREÇÃO:
────────────
- Múltipla escolha / dropdown: comparação direta com correct_answer_json
- Seleção múltipla: pontuação parcial proporcional (com penalização por erro)
- Texto curto: comparação case-insensitive com lista de respostas aceitas
- Score final = Σ(pontos obtidos) / Σ(pontos máximos) × 100`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // SJT (Situational Judgment Test)
  // ═══════════════════════════════════════════════════════════════
  sjt: [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir o SJT com ranking e seleção de opções",
      edgeFunction: "student-exam-access (lógica client-side)",
      prompt: `═══════════════════════════════════════════════════════════════
SJT (Situational Judgment Test) — INSTRUÇÕES DE BUILD COMPLETAS
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
O SJT avalia ética, profissionalismo e tomada de decisão em cenários do dia-a-dia.

Dois formatos:
  a) RANKING: O aluno ordena as opções da mais à menos apropriada
  b) SELEÇÃO: O aluno seleciona as 3 opções mais apropriadas

2. TABELAS:
───────────
CREATE TABLE sjt_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'draft',
  class_id UUID REFERENCES classes(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sjt_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sjt_exam_id UUID REFERENCES sjt_exams(id),
  scenario_text TEXT,
  response_type TEXT DEFAULT 'ranking', -- ranking ou select
  options_json JSONB, -- [{ id, text }]
  correct_order_json JSONB, -- ordem correta para ranking
  correct_selections_json JSONB, -- seleções corretas
  domain TEXT, -- ética, comunicação, equipe, conflitos, segurança
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

3. PONTUAÇÃO:
─────────────
RANKING:
  - Comparação posição a posição com gabarito
  - Cada posição correta = pontos proporcionais
  - Inversão parcial = pontuação reduzida

SELEÇÃO:
  - 1 ponto por opção correta selecionada
  - 0 pontos por incorreta (sem penalização negativa)`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // OBSERVAÇÕES CLÍNICAS (Mini-CEX / DOPS)
  // ═══════════════════════════════════════════════════════════════
  "clinical-observations": [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir Mini-CEX e DOPS com avaliação por observação direta",
      edgeFunction: "N/A (avaliação presencial, sem IA)",
      prompt: `═══════════════════════════════════════════════════════════════
OBSERVAÇÕES CLÍNICAS (Mini-CEX / DOPS) — INSTRUÇÕES DE BUILD
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
Avaliações formativas por observação direta de competências clínicas.
O avaliador observa o aluno em um encontro real e pontua em tempo real.

Mini-CEX = Mini Clinical Evaluation Exercise (encontro clínico geral)
DOPS = Direct Observation of Procedural Skills (procedimento específico)

2. TABELAS:
───────────
CREATE TABLE clinical_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  type TEXT DEFAULT 'mini-cex', -- mini-cex ou dops
  access_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 6),
  competency_domains_json JSONB,
    -- Mini-CEX: [Anamnese, Exame Físico, Raciocínio Clínico, Comunicação, Profissionalismo, Organização, Competência Global]
    -- DOPS: [Indicação, Consentimento, Preparação, Analgesia, Habilidade Técnica, Assepsia, Complicações, Comunicação, Competência Global]
  status TEXT DEFAULT 'active',
  class_id UUID REFERENCES classes(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE clinical_observation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID REFERENCES clinical_observations(id),
  student_name TEXT,
  student_email TEXT,
  evaluator_name TEXT,
  evaluator_email TEXT,
  complexity TEXT DEFAULT 'medium', -- low, medium, high
  setting TEXT, -- ambulatorio, enfermaria, PS, centro_cirurgico
  duration_minutes INTEGER,
  scores_json JSONB, -- { domain_id: score (1-9) }
  global_score INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

3. ESCALA LIKERT (1-9):
───────────────────────
1-3: Abaixo do esperado
4-6: Dentro do esperado
7-9: Acima do esperado

4. FLUXO:
─────────
- Professor cria observação (Mini-CEX ou DOPS) com domínios de competência
- Gera PIN de acesso para avaliadores
- Avaliador acessa pelo PIN, preenche:
  • Nome do aluno, complexidade, setting, duração
  • Score por domínio (slider 1-9)
  • Feedback escrito
- Dashboard com scores por aluno e domínio ao longo do tempo`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // TESTE DE PROGRESSO
  // ═══════════════════════════════════════════════════════════════
  "progress-test": [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir o Teste de Progresso com metalinguagem e análise longitudinal",
      edgeFunction: "student-exam-access (lógica client-side)",
      prompt: `═══════════════════════════════════════════════════════════════
TESTE DE PROGRESSO — INSTRUÇÕES DE BUILD COMPLETAS
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
O Progress Test avalia o crescimento longitudinal do conhecimento.
TODOS os alunos (1º ao 6º ano) respondem as MESMAS questões.
Usa METALINGUAGEM para diferenciar certeza de chute.

2. TABELAS:
───────────
CREATE TABLE progress_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  description TEXT,
  target_years_json JSONB DEFAULT '[1,2,3,4,5,6]',
  application_date DATE,
  status TEXT DEFAULT 'draft',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE progress_test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES progress_tests(id),
  question_id UUID REFERENCES question_bank(id),
  expected_year INTEGER DEFAULT 1, -- ano esperado (1-6)
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE progress_test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES progress_tests(id),
  student_name TEXT,
  student_email TEXT,
  student_year INTEGER DEFAULT 1, -- ano do aluno
  status TEXT DEFAULT 'in_progress',
  total_score NUMERIC,
  max_score NUMERIC,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE progress_test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES progress_test_sessions(id),
  question_id UUID REFERENCES progress_test_questions(id),
  answer_json JSONB, -- { selectedOption, confidence }
  response_type TEXT DEFAULT 'know',
    -- 'know' = Sei, 'guessed' = Chutei, 'dont_know' = Não sei
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

3. PONTUAÇÃO COM METALINGUAGEM:
───────────────────────────────
Resposta correta + "Sei":      +1.0 ponto
Resposta correta + "Chutei":   +0.5 ponto
Resposta "Não sei":             0.0 pontos (sem penalização)
Resposta errada + "Sei":       -0.25 pontos (penalização por afirmação incorreta)
Resposta errada + "Chutei":     0.0 pontos

4. ANÁLISE LONGITUDINAL:
────────────────────────
- Comparação do desempenho por "ano esperado" vs "ano do aluno"
- Expectativa: aluno do 4º ano acerta questões do 1º-4º, não necessariamente 5º-6º
- Gráfico radar por área de conhecimento
- Histograma de notas por ano do curso
- Evolução entre aplicações (se houver múltiplos testes)`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // ORÁCULO (Assistente do Professor)
  // ═══════════════════════════════════════════════════════════════
  oracle: [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir o Oráculo — assistente que guia o professor pela plataforma",
      edgeFunction: "oracle-agent",
      prompt: `═══════════════════════════════════════════════════════════════
ORÁCULO — INSTRUÇÕES DE BUILD COMPLETAS
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
Chat flutuante disponível em todas as páginas (para usuários logados).
Conhece TODOS os módulos e ensina passo a passo como usar.

2. COMPONENTE (OracleAgent.tsx):
────────────────────────────────
- Botão flutuante no canto inferior direito (fixed position)
- Abre painel de chat com histórico de mensagens
- Chama edge function oracle-agent com as mensagens do chat
- Respostas formatadas em Markdown

3. EDGE FUNCTION — oracle-agent:

SYSTEM PROMPT EXATO (COMPLETO):
"""
Você é o Oráculo do ProvaFácil — um assistente especialista que conhece profundamente todas as funcionalidades da plataforma. Seu papel é:

1. Entender a necessidade do usuário
2. Indicar a melhor ferramenta/módulo para resolver o problema
3. Ensinar passo a passo como usar essa ferramenta

MÓDULOS DA PLATAFORMA:

📝 BANCO DE QUESTÕES (/questoes)
- Crie questões de múltipla escolha, verdadeiro/falso, dissertativas e correspondência
- Use a IA para gerar questões automaticamente a partir de um tema
- Organize com tags e nível de dificuldade (Bloom)

📋 COMPOSITOR DE PROVAS (/compositor)
- Monte provas arrastando questões do banco
- Configure cabeçalho institucional personalizado
- Exporte em PDF profissional
- Publique online com código de acesso para alunos

🎓 TURMAS (/turmas)
- Cadastre turmas com nome, semestre e descrição
- Adicione alunos (nome + e-mail)
- Vincule provas online OU pacientes virtuais (modo exclusivo)

🏥 PACIENTES VIRTUAIS (/pacientes-virtuais)
- 10 pacientes pré-configurados (5 Dor + 5 Inflamação)
- 3 encontros progressivos: anamnese → acompanhamento → ajustes + MAI
- Correção automática por IA com rubrica de 0-10

📊 ANALYTICS DE PACIENTES VIRTUAIS (/vp-analytics)
- Dashboard com histograma de notas da turma
- Radar de desempenho nos 5 critérios da rubrica

🔬 OSCE (/osce)
- Estações clínicas com cenários, instruções e checklists
- Checklists dinâmicos: Binário, Likert, Pontuação com pesos
- Circuitos com rodízio automático e timer

🔄 SIMULAÇÃO REALÍSTICA (/simulacoes)
- Salas com pares (farmacêutico/paciente)
- Rodadas com ciclos e distribuição automática de papéis

📝 SOAP (/soap) → Documentação clínica estruturada
🔄 RECONCILIAÇÃO (/reconciliacao) → Análise de medicações
📄 DOCUMENTAÇÃO (/documentacao-salas) → Formulários + encaminhamento

🏪 MARKETPLACE (/marketplace) — Compartilhe e baixe provas
🤖 TUTOR DE IA (no Editor de Provas) — Correção assistida
📅 CALENDÁRIO (/calendario) — Datas de atividades
💳 PLANOS (/planos) — Gratuito e Premium (R$29,90/mês)

🔗 PORTAL DO ALUNO (/student/auth) — Acesso via PIN + e-mail

REGRAS:
- Seja amigável, objetivo e didático
- Use emojis para tornar as respostas mais visuais
- Quando indicar um módulo, explique O QUE fazer e ONDE clicar, com passos numerados
- Responda sempre em português
- Formate com markdown
- Seja proativo: sugira funcionalidades relacionadas
"""

Modelo: google/gemini-3-flash-preview`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // AGENTE DE VENDAS
  // ═══════════════════════════════════════════════════════════════
  sales: [
    {
      id: "build-instructions",
      label: "Instruções de Build",
      description: "Como reproduzir o Agente de Vendas na landing page",
      edgeFunction: "sales-agent",
      prompt: `═══════════════════════════════════════════════════════════════
AGENTE DE VENDAS — INSTRUÇÕES DE BUILD COMPLETAS
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
Chat flutuante na landing page (antes do login).
Consultor educacional que entende a necessidade do visitante e mostra valor.

2. COMPONENTE (SalesAgent.tsx):
───────────────────────────────
- Botão flutuante no canto inferior direito
- Abre painel de chat
- NÃO requer autenticação (público)
- Modelo: google/gemini-3-flash-preview

3. EDGE FUNCTION — sales-agent:

SYSTEM PROMPT EXATO (COMPLETO):
"""
Você é um consultor educacional do ProvaFácil — uma plataforma completa para avaliação acadêmica em saúde. Seu objetivo é entender as necessidades do visitante e mostrar como o ProvaFácil resolve seus problemas.

PERSONALIDADE:
- Consultivo, não vendedor agressivo
- Empático: entenda primeiro, sugira depois
- Proativo: faça perguntas para entender a necessidade
- Honesto: não invente funcionalidades
- Entusiasta mas profissional

ESTRATÉGIA DE CONVERSA:
1. Descubra: área de atuação, disciplina, quantidade de alunos, dores atuais
2. Conecte: relate as dores com funcionalidades específicas
3. Demonstre valor: mostre cenários práticos de uso
4. Convide: sugira o plano gratuito para experimentar sem compromisso

FUNCIONALIDADES PARA DESTACAR (conforme o perfil):

Para PROFESSORES DE FARMÁCIA/SAÚDE:
🏥 Pacientes Virtuais com IA — 10 pacientes, 3 encontros, correção automática
🔬 OSCE Digital — Estações + checklists + timer
🔄 Fluxo integrado — Simulação → SOAP → Reconciliação → Documentação

Para QUALQUER PROFESSOR:
📝 Banco de questões inteligente + geração por IA
📋 Compositor de provas com PDF e online
🤖 Correção automática de dissertativas
📊 Analytics detalhado
🏪 Marketplace

PLANOS:
🆓 Gratuito: 5 questões/mês + 1 prova/mês
💎 Premium (R$29,90/mês): acesso ilimitado, 7 dias grátis

REGRAS:
- Responda sempre em português
- Não invente funcionalidades
- Sempre mencione plano gratuito
- Máx 200 palavras por resposta
- Máx 1-2 perguntas por vez
"""`,
    },
  ],

  // ═══════════════════════════════════════════════════════════════
  // INFRAESTRUTURA COMPARTILHADA
  // ═══════════════════════════════════════════════════════════════
  infra: [
    {
      id: "ai-caller",
      label: "AI Caller (Fallback)",
      description: "Sistema de chamada de IA com fallback entre provedores",
      edgeFunction: "_shared/ai-caller.ts",
      prompt: `═══════════════════════════════════════════════════════════════
AI CALLER — SISTEMA DE FALLBACK ENTRE PROVEDORES
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
Todas as edge functions usam callAiWithFallback() para chamar a IA.
Tenta provedores externos primeiro, cai para Lovable AI se falhar.

2. PROVEDORES SUPORTADOS:
─────────────────────────
- Groq (llama-3.3-70b-versatile)
- OpenAI (gpt-4o-mini)
- Anthropic (claude-sonnet-4)
- OpenRouter (gemini-2.5-flash)
- Google (gemini-2.5-flash)
- Lovable AI (google/gemini-3-flash-preview) ← fallback padrão

3. FLUXO:
─────────
1. Busca provedores ativos na tabela ai_api_keys (provider + api_key + is_active)
2. Para cada provedor ativo, tenta chamar
3. Se OK → retorna resposta + provider name
4. Se falhar (429, 500, etc) → tenta próximo
5. Se todos falharem → cai para Lovable AI (usa LOVABLE_API_KEY)

4. TABELA DE CHAVES:
────────────────────
CREATE TABLE ai_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- groq, openai, anthropic, openrouter, google
  api_key TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

RLS: apenas admin pode ler/escrever.
Interface: AdminApiKeys.tsx no painel /admin

5. LOG DE USO:
──────────────
CREATE TABLE ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  prompt_type TEXT, -- generate_questions, grade_exam, tutor_chat, etc.
  tokens_input INTEGER,
  tokens_output INTEGER,
  estimated_cost_usd NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

Estimativa de custo por modelo (USD/1M tokens):
  gpt-4o-mini: input 0.15, output 0.60
  gemini-2.5-flash: input 0.15, output 0.60
  gemini-2.5-pro: input 1.25, output 5.00
  claude-sonnet-4: input 3.00, output 15.00

6. STREAMING:
─────────────
- ai-tutor-chat usa stream: true
- Retorna SSE (Server-Sent Events) diretamente ao frontend
- Frontend lê com ReadableStream`,
    },
    {
      id: "auth-subscription",
      label: "Autenticação e Planos",
      description: "Sistema de autenticação, roles e assinatura Stripe",
      edgeFunction: "check-subscription + create-checkout",
      prompt: `═══════════════════════════════════════════════════════════════
AUTENTICAÇÃO E PLANOS — INSTRUÇÕES DE BUILD
═══════════════════════════════════════════════════════════════

1. AUTENTICAÇÃO:
────────────────
- Supabase Auth com e-mail + senha
- Página Auth.tsx com login/signup
- Confirmação de e-mail obrigatória
- ResetPassword.tsx para recuperação de senha
- ProtectedRoute.tsx wrapper para rotas autenticadas

2. ROLES (tabela separada — NUNCA no profiles):
────────────────────────────────────────────────
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

FUNCTION has_role(user_id UUID, role app_role) → BOOLEAN
  SECURITY DEFINER para evitar recursão em RLS

3. PROFILES:
────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  full_name TEXT,
  institution TEXT,
  avatar_url TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

4. PLANOS (Stripe):
───────────────────
- Free: 5 questões IA/mês + 1 prova/mês
- Premium (R$29,90/mês): ilimitado, 7 dias grátis
- Edge functions: create-checkout, check-subscription, cancel-subscription, customer-portal
- Hook: use-subscription.tsx verifica status
- Hook: use-monthly-usage.ts conta gerações do mês

5. CONVITES DE ADMIN:
─────────────────────
CREATE TABLE admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  created_user_id UUID,
  invited_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

- Admin convida por e-mail → send-invite edge function
- Convidado recebe acesso Premium automaticamente
- FloatingAuth.tsx: dialog de login/cadastro reutilizável`,
    },
    {
      id: "portal-aluno",
      label: "Portal do Aluno",
      description: "Sistema unificado de acesso do aluno via PIN",
      edgeFunction: "student-exam-access",
      prompt: `═══════════════════════════════════════════════════════════════
PORTAL DO ALUNO — INSTRUÇÕES DE BUILD
═══════════════════════════════════════════════════════════════

1. CONCEITO:
────────────
Ponto de entrada ÚNICO para alunos (/student/auth).
NÃO requer autenticação Supabase (sem criar conta).
Acesso via PIN de 6 dígitos + nome + e-mail.

2. DETECÇÃO AUTOMÁTICA DO TIPO DE ATIVIDADE:
─────────────────────────────────────────────
Quando o aluno digita o PIN, o sistema busca em TODAS as tabelas:
  1. exam_publications.access_code → Prova online
  2. class_virtual_patients.access_code → Paciente Virtual
  3. osce_circuits.access_code → OSCE
  4. mock_trials.access_code → Júri Simulado
  5. simulation_rooms.access_code → Simulação
  6. soap_rooms.access_code → SOAP
  7. reconciliation_rooms.access_code → Reconciliação
  8. documentation_rooms.access_code → Documentação
  9. clinical_observations.access_code → Mini-CEX/DOPS
  10. progress_tests → Progress Test
  11. sct_exams → SCT
  12. kfe_exams → KFE
  13. sjt_exams → SJT

Se encontrar, redireciona para o portal correspondente.
Se não encontrar, mostra erro "Código não encontrado".

3. MODO GRUPO:
──────────────
- Para pacientes virtuais e simulações
- Primeiro aluno cria grupo, recebe link
- Outros alunos entram com mesmo PIN + código de grupo
- Notas sincronizadas entre membros do grupo (Realtime)

4. SESSION STORAGE:
───────────────────
- Credenciais do aluno (nome, email, PIN) salvas em sessionStorage
- Prefixos por módulo: exam_, vp_, osce_, mt_, sim_, soap_, recon_, doc_
- Não usa localStorage (sessão expira ao fechar aba)`,
    },
  ],
};
