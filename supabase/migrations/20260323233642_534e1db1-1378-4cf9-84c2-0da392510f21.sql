
-- ========= MEDICINE TABLES =========
CREATE TABLE public.medicine_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  description text,
  module_type text NOT NULL DEFAULT 'anamnese_medica',
  status text NOT NULL DEFAULT 'draft',
  access_code text NOT NULL DEFAULT substr(md5(random()::text), 1, 6),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medicine_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_select" ON public.medicine_rooms FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner_insert" ON public.medicine_rooms FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner_update" ON public.medicine_rooms FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner_delete" ON public.medicine_rooms FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "anon_select" ON public.medicine_rooms FOR SELECT TO anon USING (status = 'active');

CREATE TABLE public.medicine_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.medicine_rooms(id) ON DELETE CASCADE,
  student_name text NOT NULL DEFAULT '',
  student_email text,
  pair_index int NOT NULL DEFAULT -1,
  pair_position text NOT NULL DEFAULT 'X',
  participant_role text NOT NULL DEFAULT 'student',
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medicine_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_select" ON public.medicine_participants FOR SELECT USING (true);
CREATE POLICY "all_insert" ON public.medicine_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON public.medicine_participants FOR UPDATE USING (true);
CREATE POLICY "all_delete" ON public.medicine_participants FOR DELETE USING (true);

CREATE TABLE public.medicine_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.medicine_rooms(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  form_type text NOT NULL DEFAULT 'standard',
  content_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medicine_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_select" ON public.medicine_forms FOR SELECT USING (true);
CREATE POLICY "all_insert" ON public.medicine_forms FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON public.medicine_forms FOR UPDATE USING (true);
CREATE POLICY "all_delete" ON public.medicine_forms FOR DELETE USING (true);

CREATE TABLE public.medicine_clinical_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.medicine_rooms(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medicine_clinical_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_select" ON public.medicine_clinical_cases FOR SELECT USING (true);
CREATE POLICY "all_insert" ON public.medicine_clinical_cases FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON public.medicine_clinical_cases FOR UPDATE USING (true);
CREATE POLICY "all_delete" ON public.medicine_clinical_cases FOR DELETE USING (true);

CREATE TABLE public.medicine_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.medicine_rooms(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.medicine_forms(id) ON DELETE CASCADE,
  clinical_case_id uuid REFERENCES public.medicine_clinical_cases(id) ON DELETE SET NULL,
  pair_index int NOT NULL DEFAULT 0,
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_score numeric,
  ai_feedback_json jsonb,
  admin_score numeric,
  admin_feedback text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medicine_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_select" ON public.medicine_responses FOR SELECT USING (true);
CREATE POLICY "all_insert" ON public.medicine_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON public.medicine_responses FOR UPDATE USING (true);

-- ========= PHYSIOTHERAPY TABLES =========
CREATE TABLE public.physiotherapy_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  description text,
  module_type text NOT NULL DEFAULT 'avaliacao_funcional',
  status text NOT NULL DEFAULT 'draft',
  access_code text NOT NULL DEFAULT substr(md5(random()::text), 1, 6),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.physiotherapy_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_select" ON public.physiotherapy_rooms FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner_insert" ON public.physiotherapy_rooms FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner_update" ON public.physiotherapy_rooms FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner_delete" ON public.physiotherapy_rooms FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "anon_select" ON public.physiotherapy_rooms FOR SELECT TO anon USING (status = 'active');

CREATE TABLE public.physiotherapy_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.physiotherapy_rooms(id) ON DELETE CASCADE,
  student_name text NOT NULL DEFAULT '',
  student_email text,
  pair_index int NOT NULL DEFAULT -1,
  pair_position text NOT NULL DEFAULT 'X',
  participant_role text NOT NULL DEFAULT 'student',
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.physiotherapy_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_select" ON public.physiotherapy_participants FOR SELECT USING (true);
CREATE POLICY "all_insert" ON public.physiotherapy_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON public.physiotherapy_participants FOR UPDATE USING (true);
CREATE POLICY "all_delete" ON public.physiotherapy_participants FOR DELETE USING (true);

CREATE TABLE public.physiotherapy_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.physiotherapy_rooms(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  form_type text NOT NULL DEFAULT 'standard',
  content_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.physiotherapy_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_select" ON public.physiotherapy_forms FOR SELECT USING (true);
CREATE POLICY "all_insert" ON public.physiotherapy_forms FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON public.physiotherapy_forms FOR UPDATE USING (true);
CREATE POLICY "all_delete" ON public.physiotherapy_forms FOR DELETE USING (true);

CREATE TABLE public.physiotherapy_clinical_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.physiotherapy_rooms(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.physiotherapy_clinical_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_select" ON public.physiotherapy_clinical_cases FOR SELECT USING (true);
CREATE POLICY "all_insert" ON public.physiotherapy_clinical_cases FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON public.physiotherapy_clinical_cases FOR UPDATE USING (true);
CREATE POLICY "all_delete" ON public.physiotherapy_clinical_cases FOR DELETE USING (true);

CREATE TABLE public.physiotherapy_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.physiotherapy_rooms(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.physiotherapy_forms(id) ON DELETE CASCADE,
  clinical_case_id uuid REFERENCES public.physiotherapy_clinical_cases(id) ON DELETE SET NULL,
  pair_index int NOT NULL DEFAULT 0,
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_score numeric,
  ai_feedback_json jsonb,
  admin_score numeric,
  admin_feedback text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.physiotherapy_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_select" ON public.physiotherapy_responses FOR SELECT USING (true);
CREATE POLICY "all_insert" ON public.physiotherapy_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON public.physiotherapy_responses FOR UPDATE USING (true);

-- ========= BIOMEDICINE TABLES =========
CREATE TABLE public.biomedicine_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  description text,
  module_type text NOT NULL DEFAULT 'analise_laboratorial',
  status text NOT NULL DEFAULT 'draft',
  access_code text NOT NULL DEFAULT substr(md5(random()::text), 1, 6),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.biomedicine_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_select" ON public.biomedicine_rooms FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner_insert" ON public.biomedicine_rooms FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner_update" ON public.biomedicine_rooms FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner_delete" ON public.biomedicine_rooms FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "anon_select" ON public.biomedicine_rooms FOR SELECT TO anon USING (status = 'active');

CREATE TABLE public.biomedicine_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.biomedicine_rooms(id) ON DELETE CASCADE,
  student_name text NOT NULL DEFAULT '',
  student_email text,
  pair_index int NOT NULL DEFAULT -1,
  pair_position text NOT NULL DEFAULT 'X',
  participant_role text NOT NULL DEFAULT 'student',
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.biomedicine_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_select" ON public.biomedicine_participants FOR SELECT USING (true);
CREATE POLICY "all_insert" ON public.biomedicine_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON public.biomedicine_participants FOR UPDATE USING (true);
CREATE POLICY "all_delete" ON public.biomedicine_participants FOR DELETE USING (true);

CREATE TABLE public.biomedicine_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.biomedicine_rooms(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  form_type text NOT NULL DEFAULT 'standard',
  content_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.biomedicine_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_select" ON public.biomedicine_forms FOR SELECT USING (true);
CREATE POLICY "all_insert" ON public.biomedicine_forms FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON public.biomedicine_forms FOR UPDATE USING (true);
CREATE POLICY "all_delete" ON public.biomedicine_forms FOR DELETE USING (true);

CREATE TABLE public.biomedicine_clinical_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.biomedicine_rooms(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.biomedicine_clinical_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_select" ON public.biomedicine_clinical_cases FOR SELECT USING (true);
CREATE POLICY "all_insert" ON public.biomedicine_clinical_cases FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON public.biomedicine_clinical_cases FOR UPDATE USING (true);
CREATE POLICY "all_delete" ON public.biomedicine_clinical_cases FOR DELETE USING (true);

CREATE TABLE public.biomedicine_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.biomedicine_rooms(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.biomedicine_forms(id) ON DELETE CASCADE,
  clinical_case_id uuid REFERENCES public.biomedicine_clinical_cases(id) ON DELETE SET NULL,
  pair_index int NOT NULL DEFAULT 0,
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_score numeric,
  ai_feedback_json jsonb,
  admin_score numeric,
  admin_feedback text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.biomedicine_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_select" ON public.biomedicine_responses FOR SELECT USING (true);
CREATE POLICY "all_insert" ON public.biomedicine_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "all_update" ON public.biomedicine_responses FOR UPDATE USING (true);
