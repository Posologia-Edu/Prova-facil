
-- documentation_rooms
CREATE TABLE public.documentation_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  reconciliation_room_id uuid REFERENCES public.reconciliation_rooms(id),
  title text NOT NULL DEFAULT 'Nova Sala Documentação',
  description text DEFAULT '',
  access_code text NOT NULL DEFAULT substring(md5(random()::text), 1, 6),
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documentation_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all documentation_rooms" ON public.documentation_rooms FOR ALL TO public USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can CRUD own documentation_rooms" ON public.documentation_rooms FOR ALL TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon can select documentation_rooms" ON public.documentation_rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can update documentation_rooms" ON public.documentation_rooms FOR UPDATE TO anon, authenticated USING (true);

-- documentation_participants
CREATE TABLE public.documentation_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.documentation_rooms(id) ON DELETE CASCADE,
  student_name text NOT NULL DEFAULT '',
  student_email text DEFAULT '',
  pair_index integer NOT NULL DEFAULT -1,
  pair_position text NOT NULL DEFAULT 'X',
  reconciliation_participant_id uuid REFERENCES public.reconciliation_participants(id),
  participant_role text NOT NULL DEFAULT 'student',
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documentation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all documentation_participants" ON public.documentation_participants FOR ALL TO public USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner can manage documentation_participants" ON public.documentation_participants FOR ALL TO public USING (EXISTS (SELECT 1 FROM documentation_rooms r WHERE r.id = documentation_participants.room_id AND r.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM documentation_rooms r WHERE r.id = documentation_participants.room_id AND r.user_id = auth.uid()));
CREATE POLICY "Anon can select documentation_participants" ON public.documentation_participants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can insert documentation_participants" ON public.documentation_participants FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can update documentation_participants" ON public.documentation_participants FOR UPDATE TO anon, authenticated USING (true);

-- documentation_forms
CREATE TABLE public.documentation_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.documentation_rooms(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  form_type text NOT NULL DEFAULT 'referral',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documentation_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all documentation_forms" ON public.documentation_forms FOR ALL TO public USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner can manage documentation_forms" ON public.documentation_forms FOR ALL TO public USING (EXISTS (SELECT 1 FROM documentation_rooms r WHERE r.id = documentation_forms.room_id AND r.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM documentation_rooms r WHERE r.id = documentation_forms.room_id AND r.user_id = auth.uid()));
CREATE POLICY "Anon can select documentation_forms" ON public.documentation_forms FOR SELECT TO anon, authenticated USING (true);

-- documentation_clinical_cases
CREATE TABLE public.documentation_clinical_cases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.documentation_rooms(id) ON DELETE CASCADE,
  reconciliation_case_id uuid REFERENCES public.reconciliation_clinical_cases(id),
  title text NOT NULL DEFAULT '',
  content text DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documentation_clinical_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all documentation_clinical_cases" ON public.documentation_clinical_cases FOR ALL TO public USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner can manage documentation_clinical_cases" ON public.documentation_clinical_cases FOR ALL TO public USING (EXISTS (SELECT 1 FROM documentation_rooms r WHERE r.id = documentation_clinical_cases.room_id AND r.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM documentation_rooms r WHERE r.id = documentation_clinical_cases.room_id AND r.user_id = auth.uid()));
CREATE POLICY "Anon can select documentation_clinical_cases" ON public.documentation_clinical_cases FOR SELECT TO anon, authenticated USING (true);

-- documentation_responses
CREATE TABLE public.documentation_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.documentation_rooms(id) ON DELETE CASCADE,
  pair_index integer NOT NULL DEFAULT 0,
  form_id uuid NOT NULL REFERENCES public.documentation_forms(id),
  clinical_case_id uuid REFERENCES public.documentation_clinical_cases(id),
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_score numeric,
  ai_feedback_json jsonb,
  admin_score numeric,
  admin_feedback text,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documentation_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all documentation_responses" ON public.documentation_responses FOR ALL TO public USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner can manage documentation_responses" ON public.documentation_responses FOR ALL TO public USING (EXISTS (SELECT 1 FROM documentation_rooms r WHERE r.id = documentation_responses.room_id AND r.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM documentation_rooms r WHERE r.id = documentation_responses.room_id AND r.user_id = auth.uid()));
CREATE POLICY "Anon can select documentation_responses" ON public.documentation_responses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can insert documentation_responses" ON public.documentation_responses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can update documentation_responses" ON public.documentation_responses FOR UPDATE TO anon, authenticated USING (true);
