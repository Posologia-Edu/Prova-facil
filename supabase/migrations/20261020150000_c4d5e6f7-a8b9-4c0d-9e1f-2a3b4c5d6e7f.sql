-- Pacientes Virtuais · Fase 1 (P9): histórico de versões dos casos editados pelo docente.
-- Cada alteração do case_data guarda automaticamente a versão ANTERIOR (últimas 30 por caso),
-- permitindo voltar atrás no editor.

CREATE TABLE IF NOT EXISTS public.custom_virtual_patient_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.custom_virtual_patients(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  saved_by uuid,
  snapshot jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vp_versions_patient ON public.custom_virtual_patient_versions(patient_id, saved_at DESC);

ALTER TABLE public.custom_virtual_patient_versions ENABLE ROW LEVEL SECURITY;

-- Só o dono do caso vê o histórico. Não há política de escrita: quem grava é o gatilho abaixo.
DROP POLICY IF EXISTS "Owners view case versions" ON public.custom_virtual_patient_versions;
CREATE POLICY "Owners view case versions"
  ON public.custom_virtual_patient_versions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.custom_virtual_patients p
    WHERE p.id = custom_virtual_patient_versions.patient_id AND p.user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.snapshot_vp_case()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.case_data IS NOT NULL AND NEW.case_data IS DISTINCT FROM OLD.case_data THEN
    INSERT INTO public.custom_virtual_patient_versions (patient_id, saved_by, snapshot)
    VALUES (
      OLD.id,
      auth.uid(),
      jsonb_build_object('case_data', OLD.case_data, 'status', OLD.status, 'name', OLD.name, 'updated_at', OLD.updated_at)
    );
    DELETE FROM public.custom_virtual_patient_versions
    WHERE patient_id = OLD.id
      AND id NOT IN (
        SELECT id FROM public.custom_virtual_patient_versions
        WHERE patient_id = OLD.id ORDER BY saved_at DESC LIMIT 30
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_vp_case ON public.custom_virtual_patients;
CREATE TRIGGER trg_snapshot_vp_case
  BEFORE UPDATE ON public.custom_virtual_patients
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_vp_case();
