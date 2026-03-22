
-- ============ MINI-CEX / DOPS ============

CREATE TABLE public.clinical_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  class_id UUID REFERENCES public.classes(id),
  type TEXT NOT NULL DEFAULT 'mini_cex',
  title TEXT NOT NULL DEFAULT 'Nova Observação',
  competency_domains_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  access_code TEXT NOT NULL DEFAULT substring(md5(random()::text), 1, 6),
  status TEXT NOT NULL DEFAULT 'draft',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own clinical_observations" ON public.clinical_observations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all clinical_observations" ON public.clinical_observations FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can select clinical_observations" ON public.clinical_observations FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.clinical_observation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  observation_id UUID NOT NULL REFERENCES public.clinical_observations(id) ON DELETE CASCADE,
  evaluator_email TEXT NOT NULL DEFAULT '',
  evaluator_name TEXT NOT NULL DEFAULT '',
  student_name TEXT NOT NULL DEFAULT '',
  student_email TEXT DEFAULT '',
  scores_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  feedback TEXT DEFAULT '',
  global_score INTEGER DEFAULT 0,
  complexity TEXT NOT NULL DEFAULT 'medium',
  setting TEXT DEFAULT '',
  duration_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_observation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage clinical_observation_sessions" ON public.clinical_observation_sessions FOR ALL USING (EXISTS (SELECT 1 FROM clinical_observations o WHERE o.id = clinical_observation_sessions.observation_id AND o.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM clinical_observations o WHERE o.id = clinical_observation_sessions.observation_id AND o.user_id = auth.uid()));
CREATE POLICY "Admins can manage all clinical_observation_sessions" ON public.clinical_observation_sessions FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can insert clinical_observation_sessions" ON public.clinical_observation_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can select clinical_observation_sessions" ON public.clinical_observation_sessions FOR SELECT TO anon, authenticated USING (true);

-- ============ SJT ============

CREATE TABLE public.sjt_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Novo SJT',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  scoring_method TEXT NOT NULL DEFAULT 'ranking',
  class_id UUID REFERENCES public.classes(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sjt_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own sjt_exams" ON public.sjt_exams FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all sjt_exams" ON public.sjt_exams FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can select sjt_exams" ON public.sjt_exams FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.sjt_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sjt_exam_id UUID NOT NULL REFERENCES public.sjt_exams(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  scenario_text TEXT NOT NULL DEFAULT '',
  actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_ranking_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sjt_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage sjt_scenarios" ON public.sjt_scenarios FOR ALL USING (EXISTS (SELECT 1 FROM sjt_exams e WHERE e.id = sjt_scenarios.sjt_exam_id AND e.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM sjt_exams e WHERE e.id = sjt_scenarios.sjt_exam_id AND e.user_id = auth.uid()));
CREATE POLICY "Admins can manage all sjt_scenarios" ON public.sjt_scenarios FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can select sjt_scenarios" ON public.sjt_scenarios FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.sjt_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sjt_exam_id UUID NOT NULL REFERENCES public.sjt_exams(id) ON DELETE CASCADE,
  student_email TEXT,
  student_name TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  total_score NUMERIC,
  max_score NUMERIC,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sjt_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage sjt_sessions" ON public.sjt_sessions FOR ALL USING (EXISTS (SELECT 1 FROM sjt_exams e WHERE e.id = sjt_sessions.sjt_exam_id AND e.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM sjt_exams e WHERE e.id = sjt_sessions.sjt_exam_id AND e.user_id = auth.uid()));
CREATE POLICY "Admins can manage all sjt_sessions" ON public.sjt_sessions FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can insert sjt_sessions" ON public.sjt_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can select sjt_sessions" ON public.sjt_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can update sjt_sessions" ON public.sjt_sessions FOR UPDATE TO anon, authenticated USING (true);

CREATE TABLE public.sjt_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sjt_sessions(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.sjt_scenarios(id) ON DELETE CASCADE,
  student_ranking_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sjt_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage sjt_answers" ON public.sjt_answers FOR ALL USING (EXISTS (SELECT 1 FROM sjt_sessions s JOIN sjt_exams e ON e.id = s.sjt_exam_id WHERE s.id = sjt_answers.session_id AND e.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM sjt_sessions s JOIN sjt_exams e ON e.id = s.sjt_exam_id WHERE s.id = sjt_answers.session_id AND e.user_id = auth.uid()));
CREATE POLICY "Admins can manage all sjt_answers" ON public.sjt_answers FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can insert sjt_answers" ON public.sjt_answers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can select sjt_answers" ON public.sjt_answers FOR SELECT TO anon, authenticated USING (true);
