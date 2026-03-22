
-- Progress Test tables
CREATE TABLE public.progress_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Novo Progress Test',
  description text DEFAULT '',
  application_date date DEFAULT CURRENT_DATE,
  target_years_json jsonb NOT NULL DEFAULT '[1,2,3,4,5,6]',
  status text NOT NULL DEFAULT 'draft',
  deleted_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.progress_test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.progress_tests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  expected_year integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.progress_test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.progress_tests(id) ON DELETE CASCADE,
  student_email text DEFAULT NULL,
  student_name text DEFAULT NULL,
  student_year integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'in_progress',
  total_score numeric DEFAULT NULL,
  max_score numeric DEFAULT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.progress_test_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.progress_test_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.progress_test_questions(id) ON DELETE CASCADE,
  answer_json jsonb NOT NULL DEFAULT '{}',
  is_correct boolean DEFAULT NULL,
  response_type text NOT NULL DEFAULT 'know',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.progress_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_test_answers ENABLE ROW LEVEL SECURITY;

-- progress_tests policies
CREATE POLICY "Users can CRUD own progress_tests" ON public.progress_tests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all progress_tests" ON public.progress_tests FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can select progress_tests" ON public.progress_tests FOR SELECT TO anon, authenticated USING (true);

-- progress_test_questions policies
CREATE POLICY "Owner can manage progress_test_questions" ON public.progress_test_questions FOR ALL USING (EXISTS (SELECT 1 FROM progress_tests t WHERE t.id = progress_test_questions.test_id AND t.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM progress_tests t WHERE t.id = progress_test_questions.test_id AND t.user_id = auth.uid()));
CREATE POLICY "Admins can manage all progress_test_questions" ON public.progress_test_questions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can select progress_test_questions" ON public.progress_test_questions FOR SELECT TO anon, authenticated USING (true);

-- progress_test_sessions policies
CREATE POLICY "Owner can manage progress_test_sessions" ON public.progress_test_sessions FOR ALL USING (EXISTS (SELECT 1 FROM progress_tests t WHERE t.id = progress_test_sessions.test_id AND t.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM progress_tests t WHERE t.id = progress_test_sessions.test_id AND t.user_id = auth.uid()));
CREATE POLICY "Admins can manage all progress_test_sessions" ON public.progress_test_sessions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can insert progress_test_sessions" ON public.progress_test_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can select progress_test_sessions" ON public.progress_test_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can update progress_test_sessions" ON public.progress_test_sessions FOR UPDATE TO anon, authenticated USING (true);

-- progress_test_answers policies
CREATE POLICY "Owner can manage progress_test_answers" ON public.progress_test_answers FOR ALL USING (EXISTS (SELECT 1 FROM progress_test_sessions s JOIN progress_tests t ON t.id = s.test_id WHERE s.id = progress_test_answers.session_id AND t.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM progress_test_sessions s JOIN progress_tests t ON t.id = s.test_id WHERE s.id = progress_test_answers.session_id AND t.user_id = auth.uid()));
CREATE POLICY "Admins can manage all progress_test_answers" ON public.progress_test_answers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anon can insert progress_test_answers" ON public.progress_test_answers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can select progress_test_answers" ON public.progress_test_answers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can update progress_test_answers" ON public.progress_test_answers FOR UPDATE TO anon, authenticated USING (true);
