
-- Allow anon to read osce_exams (needed for evaluator/student portal RLS joins)
CREATE POLICY "Anon can select osce_exams"
ON public.osce_exams FOR SELECT
TO anon, authenticated
USING (true);
