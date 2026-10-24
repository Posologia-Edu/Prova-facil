-- P16: revisão e calibração docente das notas dos Pacientes Virtuais.
-- Quando o docente ajusta uma nota, guardamos o que a IA tinha dado (ia_original) para medir a diferença entre os dois
-- e para que "Corrigir Turma" não apague o ajuste sem aviso.

ALTER TABLE public.virtual_patient_grades
  ADD COLUMN IF NOT EXISTS ia_original jsonb,
  ADD COLUMN IF NOT EXISTS adjusted_at timestamptz,
  ADD COLUMN IF NOT EXISTS adjusted_by uuid,
  ADD COLUMN IF NOT EXISTS adjustment_reason text,
  ADD COLUMN IF NOT EXISTS adjustment_note text,
  ADD COLUMN IF NOT EXISTS adjustment_history jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.virtual_patient_grades.ia_original IS 'Instantâneo da nota da IA antes do primeiro ajuste do docente (subscores, bonus_penalidades, nota_final, nota_microlearning, feedback_resumido, orientacoes_melhoria, flags_seguranca, grading_model, rubric_version).';
COMMENT ON COLUMN public.virtual_patient_grades.adjusted_at IS 'Preenchido quando a nota atual é um ajuste do docente; nulo quando é a da IA.';
COMMENT ON COLUMN public.virtual_patient_grades.adjustment_history IS 'Ajustes do docente substituídos por uma nova correção da IA: [{at, reason, note, snapshot}].';
