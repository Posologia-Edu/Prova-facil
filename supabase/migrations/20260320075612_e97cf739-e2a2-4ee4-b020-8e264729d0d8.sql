-- Allow anon/authenticated to insert rounds (professor in virtual room)
CREATE POLICY "Anon can insert rounds"
ON public.simulation_rounds
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anon/authenticated to insert assignments (professor in virtual room)
CREATE POLICY "Anon can insert assignments"
ON public.simulation_round_assignments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anon/authenticated to update rooms (professor changing status)
CREATE POLICY "Anon can update rooms"
ON public.simulation_rooms
FOR UPDATE
TO anon, authenticated
USING (true);