
ALTER TABLE public.simulation_participants ADD COLUMN IF NOT EXISTS makeup_status text;
ALTER TABLE public.simulation_rounds ADD COLUMN IF NOT EXISTS is_makeup boolean NOT NULL DEFAULT false;
ALTER TABLE public.simulation_rounds ADD COLUMN IF NOT EXISTS makeup_batch integer NOT NULL DEFAULT 0;
ALTER TABLE public.simulation_round_assignments ADD COLUMN IF NOT EXISTS is_reused_role boolean NOT NULL DEFAULT false;
ALTER TABLE public.simulation_responses ADD COLUMN IF NOT EXISTS is_makeup boolean NOT NULL DEFAULT false;
