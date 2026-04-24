ALTER TABLE public.mock_trial_cases 
ADD COLUMN IF NOT EXISTS sections_json jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.mock_trial_cases.sections_json IS 'Estrutura por partes: [{id, key, title, summary, content, status, order}]';