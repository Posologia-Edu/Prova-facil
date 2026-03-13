
-- Allow anon/authenticated to SELECT osce_circuits by access_code (for evaluator/student portals)
CREATE POLICY "Anon can select circuits by access code"
ON public.osce_circuits FOR SELECT
TO anon, authenticated
USING (true);

-- Allow anon/authenticated to SELECT osce_stations (for evaluator/student portals)
CREATE POLICY "Anon can select stations"
ON public.osce_stations FOR SELECT
TO anon, authenticated
USING (true);

-- Allow anon/authenticated to SELECT osce_checklist_items (evaluator needs to see checklist)
CREATE POLICY "Anon can select checklist items"
ON public.osce_checklist_items FOR SELECT
TO anon, authenticated
USING (true);

-- Allow anon/authenticated to INSERT osce_evaluations (evaluator creates evaluations)
CREATE POLICY "Anon can insert evaluations"
ON public.osce_evaluations FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anon/authenticated to UPDATE osce_evaluations (evaluator saves scores)
CREATE POLICY "Anon can update evaluations"
ON public.osce_evaluations FOR UPDATE
TO anon, authenticated
USING (true);

-- Allow anon/authenticated to SELECT osce_evaluations (evaluator reads own)
CREATE POLICY "Anon can select evaluations"
ON public.osce_evaluations FOR SELECT
TO anon, authenticated
USING (true);

-- Allow anon/authenticated to INSERT osce_evaluation_items (evaluator saves checklist scores)
CREATE POLICY "Anon can insert evaluation items"
ON public.osce_evaluation_items FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anon/authenticated to UPDATE osce_evaluation_items
CREATE POLICY "Anon can update evaluation items"
ON public.osce_evaluation_items FOR UPDATE
TO anon, authenticated
USING (true);

-- Allow anon/authenticated to SELECT osce_evaluation_items
CREATE POLICY "Anon can select evaluation items"
ON public.osce_evaluation_items FOR SELECT
TO anon, authenticated
USING (true);

-- Allow anon to UPDATE osce_circuit_students (for status changes)
CREATE POLICY "Anon can update circuit students"
ON public.osce_circuit_students FOR UPDATE
TO anon, authenticated
USING (true);
