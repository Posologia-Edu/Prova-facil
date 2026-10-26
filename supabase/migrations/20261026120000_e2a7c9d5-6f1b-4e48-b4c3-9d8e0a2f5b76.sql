-- O Júri Simulado passa a poder ser vinculado a uma Turma, como o OSCE, as simulações e os formulários.
-- Só amplia a lista de tipos aceitos; nenhum dado existente é alterado.

ALTER TABLE public.class_activity_links DROP CONSTRAINT IF EXISTS class_activity_links_activity_type_check;
ALTER TABLE public.class_activity_links ADD CONSTRAINT class_activity_links_activity_type_check CHECK (activity_type IN (
  'osce',
  'simulation_anamnese', 'simulation_soap', 'simulation_reconciliation', 'simulation_documentation',
  'nursing', 'nutrition', 'dentistry', 'medicine', 'physiotherapy', 'biomedicine',
  'sct', 'kfe', 'sjt', 'progress_test', 'clinical_observation',
  'mock_trial'
));
