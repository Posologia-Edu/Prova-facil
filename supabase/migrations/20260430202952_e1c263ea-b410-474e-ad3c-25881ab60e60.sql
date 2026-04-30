ALTER TABLE public.virtual_patient_sessions ADD COLUMN IF NOT EXISTS group_id uuid;
CREATE INDEX IF NOT EXISTS idx_vp_sessions_group_id ON public.virtual_patient_sessions(group_id);