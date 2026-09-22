
-- Fix: has_role() had EXECUTE revoked from anon in a previous migration
-- (20260730082326), so any RLS policy referencing it while scoped TO public
-- makes an anon query error with "permission denied for function has_role"
-- instead of just returning zero rows. The two peer-eval tables have no
-- other permissive policy for anon (intentional — no direct anon reads),
-- so anon queries against them were hitting that error. Admins are always
-- authenticated in this app, so scope these policies to authenticated only.

DROP POLICY "Admins can manage all vp_peer_eval_tokens" ON public.virtual_patient_peer_eval_tokens;
CREATE POLICY "Admins can manage all vp_peer_eval_tokens"
  ON public.virtual_patient_peer_eval_tokens FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Admins can manage all vp_peer_evaluations" ON public.virtual_patient_peer_evaluations;
CREATE POLICY "Admins can manage all vp_peer_evaluations"
  ON public.virtual_patient_peer_evaluations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
