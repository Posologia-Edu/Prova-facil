-- P14: modo treino. Um paciente atribuído a uma turma pode ser "avaliativo" (como sempre foi: o docente libera o feedback)
-- ou "treino" (individual, uma tentativa, feedback liberado automaticamente ao fim da correção, fora das médias e da pesquisa).
-- A dificuldade é só um selo informativo do caso de treino.

ALTER TABLE public.class_virtual_patients
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'avaliativo',
  ADD COLUMN IF NOT EXISTS dificuldade text;

ALTER TABLE public.class_virtual_patients
  DROP CONSTRAINT IF EXISTS class_virtual_patients_mode_check,
  ADD CONSTRAINT class_virtual_patients_mode_check CHECK (mode IN ('avaliativo', 'treino'));

ALTER TABLE public.class_virtual_patients
  DROP CONSTRAINT IF EXISTS class_virtual_patients_dificuldade_check,
  ADD CONSTRAINT class_virtual_patients_dificuldade_check CHECK (dificuldade IS NULL OR dificuldade IN ('facil', 'medio', 'dificil'));

-- Treino: vários alunos treinam o mesmo paciente, cada um individualmente, e um aluno pode treinar vários pacientes.
-- Antes, cada aluno só podia estar em UM paciente por turma (índice único por turma + e-mail). Agora essa regra vale só
-- para os atribuídos a pacientes avaliativos; em qualquer caso, o aluno entra uma vez por paciente.
ALTER TABLE public.class_vp_assignments
  ADD COLUMN IF NOT EXISTS is_treino boolean NOT NULL DEFAULT false;

DROP INDEX IF EXISTS public.idx_class_vp_assignments_unique_student_per_class;

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_vp_assignments_unique_avaliativo
  ON public.class_vp_assignments (class_id, lower(student_email))
  WHERE NOT is_treino;

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_vp_assignments_unique_per_vp
  ON public.class_vp_assignments (class_virtual_patient_id, lower(student_email));
