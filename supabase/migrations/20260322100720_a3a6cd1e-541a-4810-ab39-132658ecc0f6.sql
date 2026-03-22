
-- Mock Trial tables
CREATE TABLE public.mock_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Novo Júri Simulado',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  judge_name TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mock_trial_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_trial_id UUID NOT NULL REFERENCES public.mock_trials(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  case_number TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT 'Novo Processo',
  process_content TEXT,
  learning_objectives TEXT,
  characters_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mock_trial_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_trial_id UUID NOT NULL REFERENCES public.mock_trials(id) ON DELETE CASCADE,
  group_number INT NOT NULL DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'Grupo 1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mock_trial_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.mock_trial_groups(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mock_trial_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.mock_trial_cases(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.mock_trial_groups(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'jury',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mock_trial_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.mock_trial_cases(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  current_phase_started_at TIMESTAMPTZ,
  judge_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mock_trial_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_trial_id UUID NOT NULL REFERENCES public.mock_trials(id) ON DELETE CASCADE,
  target_role TEXT NOT NULL DEFAULT 'jury',
  title TEXT NOT NULL DEFAULT 'Novo Formulário',
  fields_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mock_trial_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.mock_trial_forms(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.mock_trial_sessions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.mock_trial_groups(id) ON DELETE CASCADE,
  student_email TEXT,
  student_name TEXT,
  response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.mock_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_trial_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_trial_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_trial_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_trial_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_trial_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_trial_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_trial_responses ENABLE ROW LEVEL SECURITY;

-- mock_trials: owner CRUD
CREATE POLICY "Owner full access" ON public.mock_trials FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- mock_trial_cases: owner via mock_trials
CREATE POLICY "Owner access cases" ON public.mock_trial_cases FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.mock_trials WHERE id = mock_trial_id AND user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.mock_trials WHERE id = mock_trial_id AND user_id = auth.uid()));

-- mock_trial_groups: owner via mock_trials
CREATE POLICY "Owner access groups" ON public.mock_trial_groups FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.mock_trials WHERE id = mock_trial_id AND user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.mock_trials WHERE id = mock_trial_id AND user_id = auth.uid()));

-- mock_trial_students: owner via groups->mock_trials
CREATE POLICY "Owner access students" ON public.mock_trial_students FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.mock_trial_groups g JOIN public.mock_trials t ON g.mock_trial_id = t.id WHERE g.id = group_id AND t.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.mock_trial_groups g JOIN public.mock_trials t ON g.mock_trial_id = t.id WHERE g.id = group_id AND t.user_id = auth.uid()));

-- mock_trial_assignments: owner via case->mock_trials
CREATE POLICY "Owner access assignments" ON public.mock_trial_assignments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.mock_trial_cases c JOIN public.mock_trials t ON c.mock_trial_id = t.id WHERE c.id = case_id AND t.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.mock_trial_cases c JOIN public.mock_trials t ON c.mock_trial_id = t.id WHERE c.id = case_id AND t.user_id = auth.uid()));

-- mock_trial_sessions: owner + anon select
CREATE POLICY "Owner access sessions" ON public.mock_trial_sessions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.mock_trial_cases c JOIN public.mock_trials t ON c.mock_trial_id = t.id WHERE c.id = case_id AND t.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.mock_trial_cases c JOIN public.mock_trials t ON c.mock_trial_id = t.id WHERE c.id = case_id AND t.user_id = auth.uid()));
CREATE POLICY "Anon select sessions" ON public.mock_trial_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon update sessions" ON public.mock_trial_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- mock_trial_forms: owner access
CREATE POLICY "Owner access forms" ON public.mock_trial_forms FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.mock_trials WHERE id = mock_trial_id AND user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.mock_trials WHERE id = mock_trial_id AND user_id = auth.uid()));
CREATE POLICY "Anon select forms" ON public.mock_trial_forms FOR SELECT TO anon USING (true);

-- mock_trial_responses: owner select + anon insert/select
CREATE POLICY "Owner access responses" ON public.mock_trial_responses FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.mock_trial_forms f JOIN public.mock_trials t ON f.mock_trial_id = t.id WHERE f.id = form_id AND t.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.mock_trial_forms f JOIN public.mock_trials t ON f.mock_trial_id = t.id WHERE f.id = form_id AND t.user_id = auth.uid()));
CREATE POLICY "Anon insert responses" ON public.mock_trial_responses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon select responses" ON public.mock_trial_responses FOR SELECT TO anon USING (true);

-- Anon select for cases, groups, students, assignments (for student portal)
CREATE POLICY "Anon select cases" ON public.mock_trial_cases FOR SELECT TO anon USING (true);
CREATE POLICY "Anon select groups" ON public.mock_trial_groups FOR SELECT TO anon USING (true);
CREATE POLICY "Anon select students" ON public.mock_trial_students FOR SELECT TO anon USING (true);
CREATE POLICY "Anon select assignments" ON public.mock_trial_assignments FOR SELECT TO anon USING (true);
CREATE POLICY "Anon select trials" ON public.mock_trials FOR SELECT TO anon USING (true);

-- Realtime for sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.mock_trial_sessions;

-- Updated_at trigger
CREATE TRIGGER update_mock_trials_updated_at BEFORE UPDATE ON public.mock_trials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
