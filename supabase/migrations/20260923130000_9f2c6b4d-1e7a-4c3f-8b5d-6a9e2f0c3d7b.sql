-- Allow mock trial students to be registered before being assigned to a group
-- (batch registration, distributed into groups afterwards).

ALTER TABLE public.mock_trial_students
  ADD COLUMN mock_trial_id UUID REFERENCES public.mock_trials(id) ON DELETE CASCADE;

UPDATE public.mock_trial_students s
SET mock_trial_id = g.mock_trial_id
FROM public.mock_trial_groups g
WHERE s.group_id = g.id;

ALTER TABLE public.mock_trial_students
  ALTER COLUMN mock_trial_id SET NOT NULL;

ALTER TABLE public.mock_trial_students
  ALTER COLUMN group_id DROP NOT NULL;

-- Ownership no longer needs to hop through the group; check the trial directly
-- so students with no group yet are still owned by the right user.
DROP POLICY IF EXISTS "Owner access students" ON public.mock_trial_students;
CREATE POLICY "Owner access students" ON public.mock_trial_students FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mock_trials t WHERE t.id = mock_trial_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mock_trials t WHERE t.id = mock_trial_id AND t.user_id = auth.uid()));
