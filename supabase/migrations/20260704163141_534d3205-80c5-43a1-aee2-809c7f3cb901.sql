ALTER TABLE public.class_lesson_visits
  ADD COLUMN IF NOT EXISTS preceptor_name TEXT,
  ADD COLUMN IF NOT EXISTS preceptor_phone TEXT;