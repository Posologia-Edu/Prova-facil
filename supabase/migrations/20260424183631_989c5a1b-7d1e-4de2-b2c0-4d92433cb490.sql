ALTER TABLE public.mock_trial_sessions
  ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_remaining_seconds integer;