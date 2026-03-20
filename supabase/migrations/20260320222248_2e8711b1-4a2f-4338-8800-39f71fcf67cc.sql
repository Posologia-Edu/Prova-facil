
-- Reconciliation Rooms
CREATE TABLE public.reconciliation_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  soap_room_id uuid REFERENCES public.soap_rooms(id),
  title text NOT NULL DEFAULT 'Nova Sala Reconciliação',
  description text DEFAULT '',
  access_code text NOT NULL DEFAULT substring(md5(random()::text), 1, 6),
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reconciliation_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reconciliation_rooms" ON public.reconciliation_rooms FOR ALL TO public USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can CRUD own reconciliation_rooms" ON public.reconciliation_rooms FOR ALL TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon can select reconciliation_rooms" ON public.reconciliation_rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can update reconciliation_rooms" ON public.reconciliation_rooms FOR UPDATE TO anon, authenticated USING (true);

-- Reconciliation Participants
CREATE TABLE public.reconciliation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.reconciliation_rooms(id) ON DELETE CASCADE,
  student_name text NOT NULL DEFAULT '',
  student_email text DEFAULT '',
  pair_index integer NOT NULL DEFAULT -1,
  pair_position text NOT NULL DEFAULT 'X',
  soap_participant_id uuid REFERENCES public.soap_participants(id),
  participant_role text NOT NULL DEFAULT 'student',
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reconciliation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reconciliation_participants" ON public.reconciliation_participants FOR ALL TO public USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner can manage reconciliation_participants" ON public.reconciliation_participants FOR ALL TO public USING (EXISTS (SELECT 1 FROM reconciliation_rooms r WHERE r.id = reconciliation_participants.room_id AND r.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM reconciliation_rooms r WHERE r.id = reconciliation_participants.room_id AND r.user_id = auth.uid()));
CREATE POLICY "Anon can select reconciliation_participants" ON public.reconciliation_participants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can insert reconciliation_participants" ON public.reconciliation_participants FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can update reconciliation_participants" ON public.reconciliation_participants FOR UPDATE TO anon, authenticated USING (true);

-- Reconciliation Forms
CREATE TABLE public.reconciliation_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.reconciliation_rooms(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  form_type text NOT NULL DEFAULT 'reconciliation',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reconciliation_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reconciliation_forms" ON public.reconciliation_forms FOR ALL TO public USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner can manage reconciliation_forms" ON public.reconciliation_forms FOR ALL TO public USING (EXISTS (SELECT 1 FROM reconciliation_rooms r WHERE r.id = reconciliation_forms.room_id AND r.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM reconciliation_rooms r WHERE r.id = reconciliation_forms.room_id AND r.user_id = auth.uid()));
CREATE POLICY "Anon can select reconciliation_forms" ON public.reconciliation_forms FOR SELECT TO anon, authenticated USING (true);

-- Reconciliation Clinical Cases
CREATE TABLE public.reconciliation_clinical_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.reconciliation_rooms(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reconciliation_clinical_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reconciliation_clinical_cases" ON public.reconciliation_clinical_cases FOR ALL TO public USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner can manage reconciliation_clinical_cases" ON public.reconciliation_clinical_cases FOR ALL TO public USING (EXISTS (SELECT 1 FROM reconciliation_rooms r WHERE r.id = reconciliation_clinical_cases.room_id AND r.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM reconciliation_rooms r WHERE r.id = reconciliation_clinical_cases.room_id AND r.user_id = auth.uid()));
CREATE POLICY "Anon can select reconciliation_clinical_cases" ON public.reconciliation_clinical_cases FOR SELECT TO anon, authenticated USING (true);

-- Reconciliation Responses
CREATE TABLE public.reconciliation_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.reconciliation_rooms(id) ON DELETE CASCADE,
  pair_index integer NOT NULL DEFAULT 0,
  form_id uuid NOT NULL REFERENCES public.reconciliation_forms(id),
  clinical_case_id uuid REFERENCES public.reconciliation_clinical_cases(id),
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_score numeric,
  ai_feedback_json jsonb,
  admin_score numeric,
  admin_feedback text,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reconciliation_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reconciliation_responses" ON public.reconciliation_responses FOR ALL TO public USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner can manage reconciliation_responses" ON public.reconciliation_responses FOR ALL TO public USING (EXISTS (SELECT 1 FROM reconciliation_rooms r WHERE r.id = reconciliation_responses.room_id AND r.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM reconciliation_rooms r WHERE r.id = reconciliation_responses.room_id AND r.user_id = auth.uid()));
CREATE POLICY "Anon can select reconciliation_responses" ON public.reconciliation_responses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can insert reconciliation_responses" ON public.reconciliation_responses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can update reconciliation_responses" ON public.reconciliation_responses FOR UPDATE TO anon, authenticated USING (true);
