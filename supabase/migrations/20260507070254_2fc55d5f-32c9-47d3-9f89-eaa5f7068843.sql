
-- Tabela para pacientes virtuais customizados (gerados por usuário)
CREATE TABLE public.custom_virtual_patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  profession TEXT NOT NULL,
  description TEXT NOT NULL,
  clinical_context TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  baseline_vitals JSONB NOT NULL DEFAULT '{}'::jsonb,
  baseline_context TEXT NOT NULL DEFAULT '',
  clinical_case JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_custom_vp_user ON public.custom_virtual_patients(user_id);
CREATE INDEX idx_custom_vp_category ON public.custom_virtual_patients(user_id, category);

ALTER TABLE public.custom_virtual_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own custom patients"
  ON public.custom_virtual_patients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own custom patients"
  ON public.custom_virtual_patients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own custom patients"
  ON public.custom_virtual_patients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own custom patients"
  ON public.custom_virtual_patients FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_custom_virtual_patients_updated_at
  BEFORE UPDATE ON public.custom_virtual_patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
