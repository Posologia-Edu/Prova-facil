
-- 1) Lessons: per-lesson teacher + time slot notation + holiday flag
ALTER TABLE public.class_schedule_items
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.class_teachers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS time_slot text,
  ADD COLUMN IF NOT EXISTS is_holiday boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS holiday_name text;

CREATE INDEX IF NOT EXISTS idx_class_schedule_teacher ON public.class_schedule_items(teacher_id);

-- 2) Classes: weekly schedule JSON (notação 2T23 etc.)
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS weekly_schedule jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3) Parallel technical visits per lesson
CREATE TABLE IF NOT EXISTS public.class_lesson_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.class_schedule_items(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.class_teachers(id) ON DELETE SET NULL,
  title text NOT NULL,
  location text,
  notes text,
  student_ids uuid[] NOT NULL DEFAULT '{}',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_lesson_visits TO authenticated;
GRANT ALL ON public.class_lesson_visits TO service_role;
ALTER TABLE public.class_lesson_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Class owner manages lesson visits"
  ON public.class_lesson_visits FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.class_schedule_items si
    JOIN public.class_semesters sem ON sem.id = si.semester_id
    JOIN public.classes c ON c.id = sem.class_id
    WHERE si.id = class_lesson_visits.lesson_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.class_schedule_items si
    JOIN public.class_semesters sem ON sem.id = si.semester_id
    JOIN public.classes c ON c.id = sem.class_id
    WHERE si.id = class_lesson_visits.lesson_id AND c.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_lesson_visits_lesson ON public.class_lesson_visits(lesson_id);

CREATE TRIGGER trg_class_lesson_visits_updated
  BEFORE UPDATE ON public.class_lesson_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Holidays per class (or global per user when class_id is null)
CREATE TABLE IF NOT EXISTS public.class_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  holiday_date date NOT NULL,
  name text NOT NULL,
  recurring_yearly boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_holidays TO authenticated;
GRANT ALL ON public.class_holidays TO service_role;
ALTER TABLE public.class_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own holidays"
  ON public.class_holidays FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_class_holidays_user_date ON public.class_holidays(user_id, holiday_date);
CREATE INDEX IF NOT EXISTS idx_class_holidays_class ON public.class_holidays(class_id);

CREATE TRIGGER trg_class_holidays_updated
  BEFORE UPDATE ON public.class_holidays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
