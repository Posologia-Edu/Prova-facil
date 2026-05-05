DROP POLICY IF EXISTS "Anon can select virtual_patient_grades" ON public.virtual_patient_grades;

CREATE POLICY "Anon can select released virtual_patient_grades"
ON public.virtual_patient_grades
FOR SELECT
TO anon, authenticated
USING (feedback_released = true);