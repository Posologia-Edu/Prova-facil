
-- Exam publications: when a teacher publishes an exam for students
CREATE TABLE public.exam_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  time_limit_minutes integer NOT NULL DEFAULT 60,
  start_at timestamptz,
  end_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  access_code text NOT NULL DEFAULT substring(md5(random()::text), 1, 6),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage own publications"
ON public.exam_publications FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all publications"
ON public.exam_publications FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view active publications"
ON public.exam_publications FOR SELECT
USING (is_active = true AND has_role(auth.uid(), 'student'::app_role));

-- Exam sessions
CREATE TABLE public.exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid REFERENCES public.exam_publications(id) ON DELETE CASCADE NOT NULL,
  student_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  total_score numeric,
  max_score numeric,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own sessions"
ON public.exam_sessions FOR ALL
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can view sessions for their exams"
ON public.exam_sessions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.exam_publications ep
  WHERE ep.id = exam_sessions.publication_id AND ep.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all sessions"
ON public.exam_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Student answers
CREATE TABLE public.student_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.exam_sessions(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES public.question_bank(id) NOT NULL,
  answer_text text DEFAULT '',
  answer_json jsonb NOT NULL DEFAULT '{}',
  is_correct boolean,
  points_earned numeric DEFAULT 0,
  max_points numeric DEFAULT 1,
  ai_score numeric,
  ai_feedback text,
  teacher_score numeric,
  teacher_feedback text,
  grading_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own answers"
ON public.student_answers FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.exam_sessions es
  WHERE es.id = student_answers.session_id AND es.student_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.exam_sessions es
  WHERE es.id = student_answers.session_id AND es.student_id = auth.uid()
));

CREATE POLICY "Teachers can manage answers for their exams"
ON public.student_answers FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.exam_sessions es
  JOIN public.exam_publications ep ON ep.id = es.publication_id
  WHERE es.id = student_answers.session_id AND ep.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.exam_sessions es
  JOIN public.exam_publications ep ON ep.id = es.publication_id
  WHERE es.id = student_answers.session_id AND ep.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all answers"
ON public.student_answers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Triggers
CREATE TRIGGER update_exam_publications_updated_at
BEFORE UPDATE ON public.exam_publications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_answers_updated_at
BEFORE UPDATE ON public.student_answers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_answers;

-- Auto-assign student role on signup
CREATE OR REPLACE FUNCTION public.handle_student_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_student_role();

NOTIFY pgrst, 'reload schema';
