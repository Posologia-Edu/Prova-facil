
-- Create class_students table for managing students in classes
CREATE TABLE public.class_students (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  student_email text,
  student_registration text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

-- Teachers can manage students in their own classes
CREATE POLICY "Users can manage students in own classes"
ON public.class_students
FOR ALL
USING (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = class_students.class_id AND classes.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = class_students.class_id AND classes.user_id = auth.uid()));

-- Admins can manage all
CREATE POLICY "Admins can manage all class_students"
ON public.class_students
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add description column to exams for the config dialog
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS description text DEFAULT '';
