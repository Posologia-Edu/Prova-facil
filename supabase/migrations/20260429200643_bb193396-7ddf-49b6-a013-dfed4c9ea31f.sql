CREATE TABLE public.simulation_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.simulation_rooms(id) ON DELETE CASCADE,
  session_number integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_simulation_sessions_room ON public.simulation_sessions(room_id);

ALTER TABLE public.simulation_sessions ENABLE ROW LEVEL SECURITY;

-- Owners can do anything with their room's sessions
CREATE POLICY "Owners manage simulation sessions"
ON public.simulation_sessions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.simulation_rooms r
    WHERE r.id = simulation_sessions.room_id
      AND r.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.simulation_rooms r
    WHERE r.id = simulation_sessions.room_id
      AND r.user_id = auth.uid()
  )
);

-- Anyone can read sessions of a room (students reaching the room via PIN need this for the paused screen).
-- Since rooms are accessed by PIN and not strictly tied to authenticated users for participants,
-- read access mirrors the existing simulation_rounds pattern.
CREATE POLICY "Public read simulation sessions"
ON public.simulation_sessions
FOR SELECT
USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.simulation_sessions;