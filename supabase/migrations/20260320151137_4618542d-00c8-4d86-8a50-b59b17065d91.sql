
-- SOAP Rooms
CREATE TABLE public.soap_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  anamnesis_room_id uuid REFERENCES public.simulation_rooms(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Nova Sala SOAP',
  description text DEFAULT '',
  access_code text NOT NULL DEFAULT substring(md5(random()::text), 1, 6),
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.soap_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all soap_rooms" ON public.soap_rooms FOR ALL TO public
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can CRUD own soap_rooms" ON public.soap_rooms FOR ALL TO public
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon can select soap_rooms" ON public.soap_rooms FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Anon can update soap_rooms" ON public.soap_rooms FOR UPDATE TO anon, authenticated
  USING (true);

-- SOAP Participants
CREATE TABLE public.soap_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.soap_rooms(id) ON DELETE CASCADE,
  student_name text NOT NULL DEFAULT '',
  student_email text DEFAULT '',
  pair_index integer NOT NULL DEFAULT -1,
  pair_position text NOT NULL DEFAULT 'X',
  anamnesis_participant_id uuid REFERENCES public.simulation_participants(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.soap_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all soap_participants" ON public.soap_participants FOR ALL TO public
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner can manage soap_participants" ON public.soap_participants FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM soap_rooms r WHERE r.id = soap_participants.room_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM soap_rooms r WHERE r.id = soap_participants.room_id AND r.user_id = auth.uid()));
CREATE POLICY "Anon can select soap_participants" ON public.soap_participants FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Anon can update soap_participants" ON public.soap_participants FOR UPDATE TO anon, authenticated
  USING (true);
CREATE POLICY "Anon can insert soap_participants" ON public.soap_participants FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- SOAP Forms
CREATE TABLE public.soap_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.soap_rooms(id) ON DELETE CASCADE,
  form_type text NOT NULL DEFAULT 'soap',
  title text NOT NULL DEFAULT '',
  content_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.soap_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all soap_forms" ON public.soap_forms FOR ALL TO public
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner can manage soap_forms" ON public.soap_forms FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM soap_rooms r WHERE r.id = soap_forms.room_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM soap_rooms r WHERE r.id = soap_forms.room_id AND r.user_id = auth.uid()));
CREATE POLICY "Anon can select soap_forms" ON public.soap_forms FOR SELECT TO anon, authenticated
  USING (true);

-- SOAP Responses
CREATE TABLE public.soap_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.soap_rooms(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.soap_participants(id) ON DELETE CASCADE,
  target_participant_id uuid REFERENCES public.soap_participants(id) ON DELETE SET NULL,
  form_id uuid NOT NULL REFERENCES public.soap_forms(id) ON DELETE CASCADE,
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_score numeric,
  admin_feedback text,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.soap_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all soap_responses" ON public.soap_responses FOR ALL TO public
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner can manage soap_responses" ON public.soap_responses FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM soap_rooms r WHERE r.id = soap_responses.room_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM soap_rooms r WHERE r.id = soap_responses.room_id AND r.user_id = auth.uid()));
CREATE POLICY "Anon can select soap_responses" ON public.soap_responses FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Anon can insert soap_responses" ON public.soap_responses FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Anon can update soap_responses" ON public.soap_responses FOR UPDATE TO anon, authenticated
  USING (true);

-- Realtime for soap_participants and soap_responses
ALTER PUBLICATION supabase_realtime ADD TABLE public.soap_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.soap_responses;
