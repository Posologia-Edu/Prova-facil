
-- SCT Exams
CREATE TABLE public.sct_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Novo SCT',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  expert_panel_size INTEGER NOT NULL DEFAULT 10,
  class_id UUID REFERENCES public.classes(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sct_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own sct_exams" ON public.sct_exams FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all sct_exams" ON public.sct_exams FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can select sct_exams" ON public.sct_exams FOR SELECT TO anon, authenticated USING (true);

-- SCT Scenarios
CREATE TABLE public.sct_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sct_exam_id UUID NOT NULL REFERENCES public.sct_exams(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  clinical_vignette TEXT NOT NULL DEFAULT '',
  hypothesis TEXT NOT NULL DEFAULT '',
  new_information TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sct_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage sct_scenarios" ON public.sct_scenarios FOR ALL USING (EXISTS (SELECT 1 FROM sct_exams e WHERE e.id = sct_scenarios.sct_exam_id AND e.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM sct_exams e WHERE e.id = sct_scenarios.sct_exam_id AND e.user_id = auth.uid()));
CREATE POLICY "Admins can manage all sct_scenarios" ON public.sct_scenarios FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can select sct_scenarios" ON public.sct_scenarios FOR SELECT TO anon, authenticated USING (true);

-- SCT Expert Responses
CREATE TABLE public.sct_expert_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.sct_scenarios(id) ON DELETE CASCADE,
  expert_email TEXT NOT NULL DEFAULT '',
  expert_name TEXT NOT NULL DEFAULT '',
  likert_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sct_expert_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage sct_expert_responses" ON public.sct_expert_responses FOR ALL USING (EXISTS (SELECT 1 FROM sct_scenarios s JOIN sct_exams e ON e.id = s.sct_exam_id WHERE s.id = sct_expert_responses.scenario_id AND e.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM sct_scenarios s JOIN sct_exams e ON e.id = s.sct_exam_id WHERE s.id = sct_expert_responses.scenario_id AND e.user_id = auth.uid()));
CREATE POLICY "Admins can manage all sct_expert_responses" ON public.sct_expert_responses FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can insert sct_expert_responses" ON public.sct_expert_responses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can select sct_expert_responses" ON public.sct_expert_responses FOR SELECT TO anon, authenticated USING (true);

-- SCT Student Sessions
CREATE TABLE public.sct_student_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sct_exam_id UUID NOT NULL REFERENCES public.sct_exams(id) ON DELETE CASCADE,
  student_email TEXT,
  student_name TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  access_code TEXT NOT NULL DEFAULT substring(md5(random()::text), 1, 6),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  total_score NUMERIC,
  max_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sct_student_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage sct_student_sessions" ON public.sct_student_sessions FOR ALL USING (EXISTS (SELECT 1 FROM sct_exams e WHERE e.id = sct_student_sessions.sct_exam_id AND e.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM sct_exams e WHERE e.id = sct_student_sessions.sct_exam_id AND e.user_id = auth.uid()));
CREATE POLICY "Admins can manage all sct_student_sessions" ON public.sct_student_sessions FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can insert sct_student_sessions" ON public.sct_student_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can select sct_student_sessions" ON public.sct_student_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can update sct_student_sessions" ON public.sct_student_sessions FOR UPDATE TO anon, authenticated USING (true);

-- SCT Student Answers
CREATE TABLE public.sct_student_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sct_student_sessions(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.sct_scenarios(id) ON DELETE CASCADE,
  likert_value INTEGER NOT NULL DEFAULT 0,
  score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sct_student_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage sct_student_answers" ON public.sct_student_answers FOR ALL USING (EXISTS (SELECT 1 FROM sct_student_sessions ss JOIN sct_exams e ON e.id = ss.sct_exam_id WHERE ss.id = sct_student_answers.session_id AND e.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM sct_student_sessions ss JOIN sct_exams e ON e.id = ss.sct_exam_id WHERE ss.id = sct_student_answers.session_id AND e.user_id = auth.uid()));
CREATE POLICY "Admins can manage all sct_student_answers" ON public.sct_student_answers FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can insert sct_student_answers" ON public.sct_student_answers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can select sct_student_answers" ON public.sct_student_answers FOR SELECT TO anon, authenticated USING (true);
