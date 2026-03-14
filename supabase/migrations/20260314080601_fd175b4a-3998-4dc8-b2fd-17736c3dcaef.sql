ALTER TABLE public.osce_circuit_students
  ADD COLUMN station_entered_at timestamptz,
  ADD COLUMN visited_stations uuid[] DEFAULT '{}'::uuid[];