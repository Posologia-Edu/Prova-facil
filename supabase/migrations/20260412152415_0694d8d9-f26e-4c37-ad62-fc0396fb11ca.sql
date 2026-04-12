-- Allow anon/authenticated to read question_bank rows linked to published progress tests
CREATE POLICY "Anon can view questions linked to published progress tests"
ON public.question_bank
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.progress_test_questions ptq
    JOIN public.progress_tests pt ON pt.id = ptq.test_id
    WHERE ptq.question_id = question_bank.id
      AND pt.status = 'published'
  )
);