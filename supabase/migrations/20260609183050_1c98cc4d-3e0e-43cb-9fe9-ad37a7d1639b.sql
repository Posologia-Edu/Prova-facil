ALTER TABLE public.question_bank
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.question_bank(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_question_bank_parent_id ON public.question_bank(parent_id);