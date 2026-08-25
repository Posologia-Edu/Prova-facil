CREATE TABLE public.exam_reopen_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.exam_publications(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  justification text NOT NULL,
  previous_start_at timestamptz,
  previous_end_at timestamptz,
  new_start_at timestamptz,
  new_end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.exam_reopen_logs TO authenticated;
GRANT ALL ON public.exam_reopen_logs TO service_role;

ALTER TABLE public.exam_reopen_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can insert own reopen logs"
ON public.exam_reopen_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.exam_publications ep
  WHERE ep.id = publication_id AND ep.user_id = auth.uid()
));

CREATE POLICY "Teachers can view own reopen logs"
ON public.exam_reopen_logs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reopen logs"
ON public.exam_reopen_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_exam_reopen_logs_exam ON public.exam_reopen_logs(exam_id);