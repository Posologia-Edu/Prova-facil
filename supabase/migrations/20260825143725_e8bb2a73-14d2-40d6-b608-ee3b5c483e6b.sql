ALTER TABLE public.class_visit_templates
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.class_teachers(id) ON DELETE SET NULL;