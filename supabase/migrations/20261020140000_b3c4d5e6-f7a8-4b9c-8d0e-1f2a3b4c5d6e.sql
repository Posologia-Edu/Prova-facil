-- Pacientes Virtuais · Fase 1 (P8/P24): profissão avaliada em cada paciente da turma.
-- Define qual versão do caso (farmaceutico | enfermeiro | medico) será carregada na sala
-- e qual gabarito será usado na correção. Casos legados ignoram o valor.
ALTER TABLE public.class_virtual_patients
  ADD COLUMN IF NOT EXISTS profession text NOT NULL DEFAULT 'farmaceutico';
