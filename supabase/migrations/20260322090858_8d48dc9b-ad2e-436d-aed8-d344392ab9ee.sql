
-- KFE Exams
CREATE TABLE public.kfe_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Novo KFE',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  class_id UUID REFERENCES public.classes(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kfe_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own kfe_exams" ON public.kfe_exams FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all kfe_exams" ON public.kfe_exams FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can select kfe_exams" ON public.kfe_exams FOR SELECT TO anon, authenticated USING (true);

-- KFE Cases
CREATE TABLE public.kfe_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kfe_exam_id UUID NOT NULL REFERENCES public.kfe_exams(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  clinical_scenario TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kfe_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage kfe_cases" ON public.kfe_cases FOR ALL USING (EXISTS (SELECT 1 FROM kfe_exams e WHERE e.id = kfe_cases.kfe_exam_id AND e.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM kfe_exams e WHERE e.id = kfe_cases.kfe_exam_id AND e.user_id = auth.uid()));
CREATE POLICY "Admins can manage all kfe_cases" ON public.kfe_cases FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can select kfe_cases" ON public.kfe_cases FOR SELECT TO anon, authenticated USING (true);

-- KFE Key Features
CREATE TABLE public.kfe_key_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.kfe_cases(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  question_text TEXT NOT NULL DEFAULT '',
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  max_score NUMERIC NOT NULL DEFAULT 1,
  explanation TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kfe_key_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage kfe_key_features" ON public.kfe_key_features FOR ALL USING (EXISTS (SELECT 1 FROM kfe_cases c JOIN kfe_exams e ON e.id = c.kfe_exam_id WHERE c.id = kfe_key_features.case_id AND e.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM kfe_cases c JOIN kfe_exams e ON e.id = c.kfe_exam_id WHERE c.id = kfe_key_features.case_id AND e.user_id = auth.uid()));
CREATE POLICY "Admins can manage all kfe_key_features" ON public.kfe_key_features FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can select kfe_key_features" ON public.kfe_key_features FOR SELECT TO anon, authenticated USING (true);

-- KFE Sessions
CREATE TABLE public.kfe_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kfe_exam_id UUID NOT NULL REFERENCES public.kfe_exams(id) ON DELETE CASCADE,
  student_email TEXT,
  student_name TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  total_score NUMERIC,
  max_score NUMERIC,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kfe_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage kfe_sessions" ON public.kfe_sessions FOR ALL USING (EXISTS (SELECT 1 FROM kfe_exams e WHERE e.id = kfe_sessions.kfe_exam_id AND e.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM kfe_exams e WHERE e.id = kfe_sessions.kfe_exam_id AND e.user_id = auth.uid()));
CREATE POLICY "Admins can manage all kfe_sessions" ON public.kfe_sessions FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can insert kfe_sessions" ON public.kfe_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can select kfe_sessions" ON public.kfe_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can update kfe_sessions" ON public.kfe_sessions FOR UPDATE TO anon, authenticated USING (true);

-- KFE Answers
CREATE TABLE public.kfe_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.kfe_sessions(id) ON DELETE CASCADE,
  key_feature_id UUID NOT NULL REFERENCES public.kfe_key_features(id) ON DELETE CASCADE,
  answer_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kfe_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage kfe_answers" ON public.kfe_answers FOR ALL USING (EXISTS (SELECT 1 FROM kfe_sessions s JOIN kfe_exams e ON e.id = s.kfe_exam_id WHERE s.id = kfe_answers.session_id AND e.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM kfe_sessions s JOIN kfe_exams e ON e.id = s.kfe_exam_id WHERE s.id = kfe_answers.session_id AND e.user_id = auth.uid()));
CREATE POLICY "Admins can manage all kfe_answers" ON public.kfe_answers FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can insert kfe_answers" ON public.kfe_answers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can select kfe_answers" ON public.kfe_answers FOR SELECT TO anon, authenticated USING (true);
