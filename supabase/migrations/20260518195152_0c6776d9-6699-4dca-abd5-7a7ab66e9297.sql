ALTER TABLE public.mock_trial_evaluations
  DROP CONSTRAINT IF EXISTS mock_trial_evaluations_evaluated_role_check;
ALTER TABLE public.mock_trial_evaluations
  ADD CONSTRAINT mock_trial_evaluations_evaluated_role_check
  CHECK (evaluated_role = ANY (ARRAY['prosecution'::text, 'defense'::text, 'jury'::text]));

ALTER TABLE public.mock_trial_evaluations
  DROP CONSTRAINT IF EXISTS mock_trial_evaluations_evaluator_type_check;
ALTER TABLE public.mock_trial_evaluations
  ADD CONSTRAINT mock_trial_evaluations_evaluator_type_check
  CHECK (evaluator_type = ANY (ARRAY['ai_jury'::text, 'judge'::text, 'teacher'::text, 'ai_jury_panel'::text]));