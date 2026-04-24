
-- =========================================
-- mock_trial_evaluation_forms
-- =========================================
CREATE TABLE public.mock_trial_evaluation_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_trial_id uuid NOT NULL REFERENCES public.mock_trials(id) ON DELETE CASCADE,
  evaluator_type text NOT NULL CHECK (evaluator_type IN ('judge','teacher')),
  title text NOT NULL,
  fields_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mock_trial_id, evaluator_type)
);

ALTER TABLE public.mock_trial_evaluation_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manage evaluation forms"
ON public.mock_trial_evaluation_forms
TO authenticated
USING (EXISTS (SELECT 1 FROM public.mock_trials t WHERE t.id = mock_trial_evaluation_forms.mock_trial_id AND t.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.mock_trials t WHERE t.id = mock_trial_evaluation_forms.mock_trial_id AND t.user_id = auth.uid()));

CREATE POLICY "Anon select evaluation forms"
ON public.mock_trial_evaluation_forms
FOR SELECT
TO anon
USING (true);

CREATE TRIGGER update_mte_forms_updated_at
BEFORE UPDATE ON public.mock_trial_evaluation_forms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- mock_trial_evaluations
-- =========================================
CREATE TABLE public.mock_trial_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.mock_trial_sessions(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.mock_trial_cases(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.mock_trial_groups(id) ON DELETE CASCADE,
  evaluated_role text NOT NULL CHECK (evaluated_role IN ('prosecution','defense')),
  evaluator_type text NOT NULL CHECK (evaluator_type IN ('ai_jury','judge','teacher')),
  score numeric(5,2) NOT NULL DEFAULT 0,
  max_score numeric(5,2) NOT NULL DEFAULT 10,
  criteria_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback text,
  ai_generated boolean NOT NULL DEFAULT false,
  edited_by_teacher boolean NOT NULL DEFAULT false,
  evaluator_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, group_id, evaluator_type)
);

CREATE INDEX idx_mte_session ON public.mock_trial_evaluations(session_id);
CREATE INDEX idx_mte_case ON public.mock_trial_evaluations(case_id);

ALTER TABLE public.mock_trial_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manage evaluations"
ON public.mock_trial_evaluations
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.mock_trial_cases c
  JOIN public.mock_trials t ON t.id = c.mock_trial_id
  WHERE c.id = mock_trial_evaluations.case_id AND t.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.mock_trial_cases c
  JOIN public.mock_trials t ON t.id = c.mock_trial_id
  WHERE c.id = mock_trial_evaluations.case_id AND t.user_id = auth.uid()
));

CREATE POLICY "Anon select evaluations"
ON public.mock_trial_evaluations
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon insert evaluations"
ON public.mock_trial_evaluations
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (SELECT 1 FROM public.mock_trial_sessions s WHERE s.id = mock_trial_evaluations.session_id)
);

CREATE POLICY "Anon update evaluations"
ON public.mock_trial_evaluations
FOR UPDATE
TO anon
USING (
  EXISTS (SELECT 1 FROM public.mock_trial_sessions s WHERE s.id = mock_trial_evaluations.session_id)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.mock_trial_sessions s WHERE s.id = mock_trial_evaluations.session_id)
);

CREATE TRIGGER update_mte_evaluations_updated_at
BEFORE UPDATE ON public.mock_trial_evaluations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.mock_trial_evaluations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mock_trial_evaluation_forms;
