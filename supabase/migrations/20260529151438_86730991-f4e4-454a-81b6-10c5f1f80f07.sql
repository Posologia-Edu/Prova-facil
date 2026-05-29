-- Gradebook columns: configurable assessment columns per semester
CREATE TABLE public.class_grade_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES public.class_semesters(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual', -- manual | exam | virtual_patient | simulation | seminar
  source_ref_id UUID,
  weight NUMERIC NOT NULL DEFAULT 1,
  max_score NUMERIC NOT NULL DEFAULT 10,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_grade_columns TO authenticated;
GRANT ALL ON public.class_grade_columns TO service_role;

ALTER TABLE public.class_grade_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages grade columns"
ON public.class_grade_columns FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_grade_columns.class_id AND c.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_grade_columns.class_id AND c.user_id = auth.uid()));

CREATE TRIGGER update_class_grade_columns_updated_at
BEFORE UPDATE ON public.class_grade_columns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Manual grade entries per student per column
CREATE TABLE public.class_grade_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  column_id UUID NOT NULL REFERENCES public.class_grade_columns(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.class_students(id) ON DELETE CASCADE,
  score NUMERIC,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (column_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_grade_entries TO authenticated;
GRANT ALL ON public.class_grade_entries TO service_role;

ALTER TABLE public.class_grade_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages grade entries"
ON public.class_grade_entries FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.class_grade_columns gc JOIN public.classes c ON c.id = gc.class_id
  WHERE gc.id = class_grade_entries.column_id AND c.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.class_grade_columns gc JOIN public.classes c ON c.id = gc.class_id
  WHERE gc.id = class_grade_entries.column_id AND c.user_id = auth.uid()
));

CREATE TRIGGER update_class_grade_entries_updated_at
BEFORE UPDATE ON public.class_grade_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Attendance per lesson per student
CREATE TABLE public.class_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.class_schedule_items(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.class_students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'present', -- present | absent | late | justified
  justification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_attendance TO authenticated;
GRANT ALL ON public.class_attendance TO service_role;

ALTER TABLE public.class_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages attendance"
ON public.class_attendance FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.class_schedule_items si
  JOIN public.class_semesters s ON s.id = si.semester_id
  JOIN public.classes c ON c.id = s.class_id
  WHERE si.id = class_attendance.lesson_id AND c.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.class_schedule_items si
  JOIN public.class_semesters s ON s.id = si.semester_id
  JOIN public.classes c ON c.id = s.class_id
  WHERE si.id = class_attendance.lesson_id AND c.user_id = auth.uid()
));

CREATE TRIGGER update_class_attendance_updated_at
BEFORE UPDATE ON public.class_attendance
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_class_grade_columns_semester ON public.class_grade_columns(semester_id);
CREATE INDEX idx_class_grade_entries_column ON public.class_grade_entries(column_id);
CREATE INDEX idx_class_grade_entries_student ON public.class_grade_entries(student_id);
CREATE INDEX idx_class_attendance_lesson ON public.class_attendance(lesson_id);
CREATE INDEX idx_class_attendance_student ON public.class_attendance(student_id);