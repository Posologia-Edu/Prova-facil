CREATE TABLE public.mock_trial_case_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Processo sem título',
  case_number TEXT,
  learning_objectives TEXT,
  process_content TEXT NOT NULL DEFAULT '',
  characters_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source_case_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mock_trial_case_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner select bank" ON public.mock_trial_case_bank
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner insert bank" ON public.mock_trial_case_bank
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update bank" ON public.mock_trial_case_bank
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner delete bank" ON public.mock_trial_case_bank
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_mock_trial_case_bank_user ON public.mock_trial_case_bank(user_id, created_at DESC);

CREATE TRIGGER update_mock_trial_case_bank_updated_at
  BEFORE UPDATE ON public.mock_trial_case_bank
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();