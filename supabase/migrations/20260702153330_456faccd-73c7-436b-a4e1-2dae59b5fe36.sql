ALTER TABLE public.simulation_rooms ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.soap_rooms ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.reconciliation_rooms ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.documentation_rooms ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;