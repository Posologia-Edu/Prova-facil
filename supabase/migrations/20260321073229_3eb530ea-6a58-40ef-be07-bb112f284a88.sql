
CREATE POLICY "Anon can select class_students for VP access"
ON public.class_students
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM class_virtual_patients cvp
    WHERE cvp.class_id = class_students.class_id
    AND cvp.status = 'active'
  )
);
