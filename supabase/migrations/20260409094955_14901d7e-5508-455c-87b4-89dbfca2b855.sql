
-- 1. Create competency_scores table
CREATE TABLE public.competency_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_email text NOT NULL,
  competency_id uuid NOT NULL REFERENCES public.competency_definitions(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 100,
  source_type text NOT NULL,
  source_id uuid,
  source_label text,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicates
CREATE UNIQUE INDEX idx_competency_scores_unique 
ON public.competency_scores (source_type, source_id, competency_id, student_email);

-- Performance indexes
CREATE INDEX idx_competency_scores_user ON public.competency_scores (user_id);
CREATE INDEX idx_competency_scores_student ON public.competency_scores (student_email);
CREATE INDEX idx_competency_scores_competency ON public.competency_scores (competency_id);
CREATE INDEX idx_competency_scores_evaluated ON public.competency_scores (evaluated_at);

-- Enable RLS
ALTER TABLE public.competency_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own competency scores"
ON public.competency_scores FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own competency scores"
ON public.competency_scores FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own competency scores"
ON public.competency_scores FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own competency scores"
ON public.competency_scores FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 2. Add competency_ids to module tables
ALTER TABLE public.osce_stations ADD COLUMN competency_ids uuid[] DEFAULT '{}';

ALTER TABLE public.simulation_rooms ADD COLUMN competency_ids uuid[] DEFAULT '{}';
ALTER TABLE public.soap_rooms ADD COLUMN competency_ids uuid[] DEFAULT '{}';
ALTER TABLE public.reconciliation_rooms ADD COLUMN competency_ids uuid[] DEFAULT '{}';
ALTER TABLE public.documentation_rooms ADD COLUMN competency_ids uuid[] DEFAULT '{}';

ALTER TABLE public.biomedicine_rooms ADD COLUMN competency_ids uuid[] DEFAULT '{}';
ALTER TABLE public.medicine_rooms ADD COLUMN competency_ids uuid[] DEFAULT '{}';
ALTER TABLE public.nursing_rooms ADD COLUMN competency_ids uuid[] DEFAULT '{}';
ALTER TABLE public.nutrition_rooms ADD COLUMN competency_ids uuid[] DEFAULT '{}';
ALTER TABLE public.dentistry_rooms ADD COLUMN competency_ids uuid[] DEFAULT '{}';
ALTER TABLE public.physiotherapy_rooms ADD COLUMN competency_ids uuid[] DEFAULT '{}';

ALTER TABLE public.clinical_observations ADD COLUMN competency_ids uuid[] DEFAULT '{}';
