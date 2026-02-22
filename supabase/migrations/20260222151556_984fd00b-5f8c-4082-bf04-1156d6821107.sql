-- Allow students to view exam_questions for exams they have active sessions in
CREATE POLICY "Students can view questions for their exam sessions"
ON public.exam_questions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM exam_sessions es
    JOIN exam_publications ep ON ep.id = es.publication_id
    WHERE ep.exam_id = exam_questions.exam_id
    AND es.student_id = auth.uid()
  )
);

-- Allow students to view question_bank entries for exams they have sessions in
CREATE POLICY "Students can view questions for their exams"
ON public.question_bank FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM exam_questions eq
    JOIN exam_publications ep ON ep.exam_id = eq.exam_id
    JOIN exam_sessions es ON es.publication_id = ep.id
    WHERE eq.question_id = question_bank.id
    AND es.student_id = auth.uid()
  )
);

-- Allow students to view exam title
CREATE POLICY "Students can view exams they have sessions for"
ON public.exams FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM exam_publications ep
    JOIN exam_sessions es ON es.publication_id = ep.id
    WHERE ep.exam_id = exams.id
    AND es.student_id = auth.uid()
  )
);

-- Allow user_roles to be read by the user themselves
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);