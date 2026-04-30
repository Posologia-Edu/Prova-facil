-- Assignments table linking class students to virtual patients
CREATE TABLE IF NOT EXISTS public.class_vp_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_virtual_patient_id UUID NOT NULL REFERENCES public.class_virtual_patients(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  class_student_id UUID NOT NULL REFERENCES public.class_students(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  student_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- A student email can only be assigned to ONE virtual patient per class
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_vp_assignments_unique_student_per_class
  ON public.class_vp_assignments(class_id, lower(student_email));

CREATE INDEX IF NOT EXISTS idx_class_vp_assignments_cvp ON public.class_vp_assignments(class_virtual_patient_id);
CREATE INDEX IF NOT EXISTS idx_class_vp_assignments_class ON public.class_vp_assignments(class_id);

ALTER TABLE public.class_vp_assignments ENABLE ROW LEVEL SECURITY;

-- Owner of the class can manage assignments
CREATE POLICY "Owner can manage class_vp_assignments"
  ON public.class_vp_assignments
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_vp_assignments.class_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_vp_assignments.class_id AND c.user_id = auth.uid()));

-- Admins can manage all
CREATE POLICY "Admins can manage all class_vp_assignments"
  ON public.class_vp_assignments
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anonymous/students need to read their own assignment by email at PIN entry time
CREATE POLICY "Anon can select assignments for VP access"
  ON public.class_vp_assignments
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.class_virtual_patients cvp
    WHERE cvp.id = class_vp_assignments.class_virtual_patient_id
      AND cvp.status = 'active'
  ));