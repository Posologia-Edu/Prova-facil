-- Pacientes Virtuais · Fase 0 (P1, P2, P6)

-- P6: autoria de cada mensagem do aluno no chat de grupo.
ALTER TABLE public.virtual_patient_messages
  ADD COLUMN IF NOT EXISTS author_email text,
  ADD COLUMN IF NOT EXISTS author_name text;

-- P2: condutas do aluno extraídas por encontro (cache), usadas pelo paciente
-- para lembrar exatamente o que foi prescrito/pedido nos encontros anteriores.
-- Formato: { "1": { ...condutas do encontro 1... }, "2": { ... } }
ALTER TABLE public.virtual_patient_sessions
  ADD COLUMN IF NOT EXISTS encounter_conducts jsonb NOT NULL DEFAULT '{}'::jsonb;

-- P1: a nota passa a registrar a rubrica, o modelo e a data da correção,
-- além da resposta bruta da IA para auditoria.
ALTER TABLE public.virtual_patient_grades
  ADD COLUMN IF NOT EXISTS rubric_version text,
  ADD COLUMN IF NOT EXISTS grading_model text,
  ADD COLUMN IF NOT EXISTS graded_at timestamptz,
  ADD COLUMN IF NOT EXISTS raw_ai_response text;
