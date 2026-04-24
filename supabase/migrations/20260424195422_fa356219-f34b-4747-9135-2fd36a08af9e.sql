-- Mock trial generation jobs: tracks async, multi-step generation/regeneration of a process.
CREATE TABLE public.mock_trial_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_trial_id UUID NOT NULL REFERENCES public.mock_trials(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.mock_trial_cases(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'create', -- 'create' | 'regenerate'
  status TEXT NOT NULL DEFAULT 'queued', -- queued | planning | generating_section | generating_annex | repairing | assembling | validating | completed | failed
  current_step TEXT,
  progress INT NOT NULL DEFAULT 0, -- 0-100
  total_steps INT NOT NULL DEFAULT 1,
  completed_steps INT NOT NULL DEFAULT 0,
  attempts INT NOT NULL DEFAULT 0,
  learning_objectives TEXT,
  case_number TEXT,
  pdf_content TEXT,
  blueprint_json JSONB, -- caso planejado: réu, vítima, profissão, anexos planejados, easter eggs etc
  sections_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- { relato, fundamentacao, denuncia, depoimentos, peritos, anexos[], characters[], image_attachments[] }
  validation_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_error TEXT,
  result_case_id UUID REFERENCES public.mock_trial_cases(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_mtgj_trial ON public.mock_trial_generation_jobs(mock_trial_id);
CREATE INDEX idx_mtgj_case ON public.mock_trial_generation_jobs(case_id);
CREATE INDEX idx_mtgj_status ON public.mock_trial_generation_jobs(status);

ALTER TABLE public.mock_trial_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner access mt jobs" ON public.mock_trial_generation_jobs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mock_trials t WHERE t.id = mock_trial_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mock_trials t WHERE t.id = mock_trial_id AND t.user_id = auth.uid()));

CREATE TRIGGER update_mock_trial_generation_jobs_updated_at
  BEFORE UPDATE ON public.mock_trial_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.mock_trial_generation_jobs;

-- Add a generation_status to cases so the editor can hide unfinished ones from publishing flows
ALTER TABLE public.mock_trial_cases
  ADD COLUMN IF NOT EXISTS generation_status TEXT NOT NULL DEFAULT 'ready'; -- ready | generating | failed