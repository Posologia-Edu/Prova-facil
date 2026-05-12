ALTER TABLE public.soap_responses 
  ADD COLUMN IF NOT EXISTS needs_teacher_peer_eval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS teacher_filled boolean NOT NULL DEFAULT false;