
CREATE TABLE public.clinical_case_bank (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('anamnesis', 'reconciliation')),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_case_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cases" ON public.clinical_case_bank FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own cases" ON public.clinical_case_bank FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cases" ON public.clinical_case_bank FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cases" ON public.clinical_case_bank FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_clinical_case_bank_user_phase ON public.clinical_case_bank (user_id, phase);

CREATE TRIGGER update_clinical_case_bank_updated_at
  BEFORE UPDATE ON public.clinical_case_bank
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
