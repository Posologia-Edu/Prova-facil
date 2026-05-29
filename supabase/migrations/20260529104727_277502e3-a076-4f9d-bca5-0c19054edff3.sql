
-- 1) question_competencies: restrict mutations to the question owner
DROP POLICY IF EXISTS "Authenticated can manage question competencies" ON public.question_competencies;

CREATE POLICY "Anyone authenticated can read question competencies"
ON public.question_competencies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Question owners can insert competencies"
ON public.question_competencies FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.question_bank qb WHERE qb.id = question_id AND qb.user_id = auth.uid()));

CREATE POLICY "Question owners can update competencies"
ON public.question_competencies FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.question_bank qb WHERE qb.id = question_id AND qb.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.question_bank qb WHERE qb.id = question_id AND qb.user_id = auth.uid()));

CREATE POLICY "Question owners can delete competencies"
ON public.question_competencies FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.question_bank qb WHERE qb.id = question_id AND qb.user_id = auth.uid()));

-- 2) portfolio_entries: restrict mutations to teachers/admins (no PII enumeration via mutation by any logged-in user)
DROP POLICY IF EXISTS "Authenticated can manage portfolio entries" ON public.portfolio_entries;

CREATE POLICY "Teachers and admins can insert portfolio entries"
ON public.portfolio_entries FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers and admins can update portfolio entries"
ON public.portfolio_entries FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers and admins can delete portfolio entries"
ON public.portfolio_entries FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- 3) exam-proctoring bucket: restrict SELECT to the publication owner
DROP POLICY IF EXISTS "Teachers can view proctoring photos" ON storage.objects;

CREATE POLICY "Publishers can view their exam proctoring photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'exam-proctoring'
  AND EXISTS (
    SELECT 1
    FROM public.exam_sessions es
    JOIN public.exam_publications ep ON ep.id = es.publication_id
    WHERE es.id::text = (storage.foldername(name))[1]
      AND ep.user_id = auth.uid()
  )
);
