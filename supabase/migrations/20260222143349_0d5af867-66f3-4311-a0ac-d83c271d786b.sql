
-- Allow authenticated users to read exams that are shared on the marketplace
CREATE POLICY "Anyone can view marketplace shared exams"
ON public.exams FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_exams me
    WHERE me.exam_id = exams.id AND me.is_active = true
  )
);

-- Allow authenticated users to read questions from marketplace shared exams
CREATE POLICY "Anyone can view questions from marketplace exams"
ON public.question_bank FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.exam_questions eq
    JOIN public.marketplace_exams me ON me.exam_id = eq.exam_id
    WHERE eq.question_id = question_bank.id AND me.is_active = true
  )
);

-- Allow reading exam_questions for marketplace exams
CREATE POLICY "Anyone can view exam_questions from marketplace exams"
ON public.exam_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_exams me
    WHERE me.exam_id = exam_questions.exam_id AND me.is_active = true
  )
);
