
ALTER TABLE public.virtual_patient_sessions
  ADD COLUMN IF NOT EXISTS research_consent boolean,
  ADD COLUMN IF NOT EXISTS research_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS research_consent_version text,
  ADD COLUMN IF NOT EXISTS research_consent_ip text;
