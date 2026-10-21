-- Remover um paciente virtual da turma falhava (em silêncio) quando já havia sessões de alunos:
-- virtual_patient_sessions.class_virtual_patient_id referenciava o vínculo sem ON DELETE e o docente
-- não tem permissão de apagar sessões. Agora as sessões (e, em cascata, mensagens e notas) saem junto
-- com o vínculo; a tela pede confirmação antes.
DO $$
DECLARE
  _con text;
BEGIN
  FOR _con IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.virtual_patient_sessions'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'public.class_virtual_patients'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.virtual_patient_sessions DROP CONSTRAINT %I', _con);
  END LOOP;
END $$;

ALTER TABLE public.virtual_patient_sessions
  ADD CONSTRAINT virtual_patient_sessions_class_virtual_patient_id_fkey
  FOREIGN KEY (class_virtual_patient_id) REFERENCES public.class_virtual_patients(id) ON DELETE CASCADE;
