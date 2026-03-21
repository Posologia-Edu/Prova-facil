
-- Table: class_virtual_patients (links a virtual patient to a class with unique PIN)
CREATE TABLE public.class_virtual_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  patient_id text NOT NULL,
  access_code text NOT NULL DEFAULT substring(md5(random()::text), 1, 6),
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, patient_id)
);

ALTER TABLE public.class_virtual_patients ENABLE ROW LEVEL SECURITY;

-- Owner of class can CRUD
CREATE POLICY "Owner can manage class_virtual_patients"
  ON public.class_virtual_patients FOR ALL
  TO public
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_virtual_patients.class_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_virtual_patients.class_id AND c.user_id = auth.uid()));

-- Anon/authenticated can SELECT (for PIN lookup)
CREATE POLICY "Anon can select class_virtual_patients"
  ON public.class_virtual_patients FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin full access
CREATE POLICY "Admins can manage all class_virtual_patients"
  ON public.class_virtual_patients FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Alter virtual_patient_sessions: add class context and student info
ALTER TABLE public.virtual_patient_sessions
  ADD COLUMN class_virtual_patient_id uuid REFERENCES public.class_virtual_patients(id),
  ADD COLUMN student_email text,
  ADD COLUMN student_name text;

-- Table: virtual_patient_grades (AI tutor grading results)
CREATE TABLE public.virtual_patient_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.virtual_patient_sessions(id) ON DELETE CASCADE,
  class_virtual_patient_id uuid NOT NULL REFERENCES public.class_virtual_patients(id) ON DELETE CASCADE,
  subscores jsonb NOT NULL DEFAULT '{}'::jsonb,
  bonus_penalidades jsonb DEFAULT '{}'::jsonb,
  nota_final numeric,
  nota_microlearning numeric,
  feedback_resumido text,
  orientacoes_melhoria text,
  flags_seguranca jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.virtual_patient_grades ENABLE ROW LEVEL SECURITY;

-- Owner of class can manage grades
CREATE POLICY "Owner can manage virtual_patient_grades"
  ON public.virtual_patient_grades FOR ALL
  TO public
  USING (EXISTS (
    SELECT 1 FROM public.class_virtual_patients cvp
    JOIN public.classes c ON c.id = cvp.class_id
    WHERE cvp.id = virtual_patient_grades.class_virtual_patient_id AND c.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.class_virtual_patients cvp
    JOIN public.classes c ON c.id = cvp.class_id
    WHERE cvp.id = virtual_patient_grades.class_virtual_patient_id AND c.user_id = auth.uid()
  ));

-- Anon can select own grades
CREATE POLICY "Anon can select virtual_patient_grades"
  ON public.virtual_patient_grades FOR SELECT
  TO anon, authenticated
  USING (true);

-- Anon can insert grades (for edge function)
CREATE POLICY "Anon can insert virtual_patient_grades"
  ON public.virtual_patient_grades FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admin full access
CREATE POLICY "Admins can manage all virtual_patient_grades"
  ON public.virtual_patient_grades FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
