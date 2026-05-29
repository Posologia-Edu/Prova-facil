
ALTER TABLE public.class_schedule_items
  ADD COLUMN IF NOT EXISTS rubric_json jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.class_seminar_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.class_schedule_items(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.class_students(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 0,
  percent numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_seminar_evaluations TO authenticated;
GRANT ALL ON public.class_seminar_evaluations TO service_role;

ALTER TABLE public.class_seminar_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage seminar evaluations"
ON public.class_seminar_evaluations
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.class_schedule_items i
    JOIN public.class_semesters s ON s.id = i.semester_id
    JOIN public.classes c ON c.id = s.class_id
  WHERE i.id = class_seminar_evaluations.lesson_id AND c.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.class_schedule_items i
    JOIN public.class_semesters s ON s.id = i.semester_id
    JOIN public.classes c ON c.id = s.class_id
  WHERE i.id = class_seminar_evaluations.lesson_id AND c.user_id = auth.uid()
));

CREATE POLICY "Admins manage seminar evaluations"
ON public.class_seminar_evaluations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_seminar_evals_updated
BEFORE UPDATE ON public.class_seminar_evaluations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_seminar_evals_lesson ON public.class_seminar_evaluations(lesson_id);
