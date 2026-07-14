
-- Students: personal PIN for check-in
ALTER TABLE public.class_students
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS pin_last_sent_at timestamptz;

-- Lessons: check-in state and optional geofence
ALTER TABLE public.class_schedule_items
  ADD COLUMN IF NOT EXISTS checkin_open boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checkin_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkin_geo_lat double precision,
  ADD COLUMN IF NOT EXISTS checkin_geo_lng double precision,
  ADD COLUMN IF NOT EXISTS checkin_geo_radius_m integer;

-- Attendance rows: capture provenance
ALTER TABLE public.class_attendance
  ADD COLUMN IF NOT EXISTS checkin_method text,
  ADD COLUMN IF NOT EXISTS checkin_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkin_lat double precision,
  ADD COLUMN IF NOT EXISTS checkin_lng double precision;

-- Ensure only one attendance per (lesson, student)
CREATE UNIQUE INDEX IF NOT EXISTS class_attendance_lesson_student_key
  ON public.class_attendance (lesson_id, student_id);

-- Anonymous access needs to be able to read the lesson's checkin state.
-- Add a permissive SELECT policy for anon limited by checkin_open = true.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='class_schedule_items'
      AND policyname='Public can read lessons with open check-in'
  ) THEN
    CREATE POLICY "Public can read lessons with open check-in"
    ON public.class_schedule_items
    FOR SELECT
    TO anon, authenticated
    USING (checkin_open = true);
  END IF;
END$$;

GRANT SELECT ON public.class_schedule_items TO anon;
