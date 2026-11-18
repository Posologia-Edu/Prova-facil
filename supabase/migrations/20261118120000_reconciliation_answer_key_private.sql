-- D11: o espelho de respostas (answer_key) da Reconciliacao v1 deixa de ser legivel por anon.
-- Dono da sala e admin continuam lendo/escrevendo pelas politicas "FOR ALL" ja existentes.
DROP POLICY IF EXISTS "Anon can select reconciliation_forms" ON public.reconciliation_forms;

CREATE POLICY "Anon can select reconciliation_forms (sem espelho)"
ON public.reconciliation_forms
FOR SELECT TO anon, authenticated
USING (form_type <> 'answer_key');
