ALTER TABLE public.mock_trial_case_bank
ADD COLUMN IF NOT EXISTS images_json JSONB NOT NULL DEFAULT '[]'::jsonb;