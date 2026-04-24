-- Allow the Judge panel (anon) to create the session row when entering a case
CREATE POLICY "Anon insert sessions"
ON public.mock_trial_sessions
FOR INSERT
TO anon
WITH CHECK (true);