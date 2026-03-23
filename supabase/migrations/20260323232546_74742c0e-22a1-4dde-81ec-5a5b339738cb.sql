
-- =============================================
-- NUTRITION TABLES
-- =============================================

CREATE TABLE public.nutrition_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  description text,
  module_type text NOT NULL DEFAULT 'anamnese_nutricional',
  access_code text NOT NULL DEFAULT substr(md5(random()::text), 1, 6),
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage nutrition_rooms" ON public.nutrition_rooms FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anon can select active nutrition_rooms" ON public.nutrition_rooms FOR SELECT TO anon USING (status = 'active');

CREATE TABLE public.nutrition_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.nutrition_rooms(id) ON DELETE CASCADE NOT NULL,
  student_name text NOT NULL DEFAULT '',
  student_email text,
  pair_index integer NOT NULL DEFAULT -1,
  pair_position text NOT NULL DEFAULT 'X',
  participant_role text NOT NULL DEFAULT 'student',
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can manage nutrition_participants" ON public.nutrition_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon can select nutrition_participants" ON public.nutrition_participants FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert nutrition_participants" ON public.nutrition_participants FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update nutrition_participants" ON public.nutrition_participants FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE TABLE public.nutrition_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.nutrition_rooms(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT '',
  form_type text NOT NULL DEFAULT 'standard',
  content_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can manage nutrition_forms" ON public.nutrition_forms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon can select nutrition_forms" ON public.nutrition_forms FOR SELECT TO anon USING (true);

CREATE TABLE public.nutrition_clinical_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.nutrition_rooms(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT '',
  content text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_clinical_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can manage nutrition_clinical_cases" ON public.nutrition_clinical_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon can select nutrition_clinical_cases" ON public.nutrition_clinical_cases FOR SELECT TO anon USING (true);

CREATE TABLE public.nutrition_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.nutrition_rooms(id) ON DELETE CASCADE NOT NULL,
  form_id uuid REFERENCES public.nutrition_forms(id) ON DELETE CASCADE NOT NULL,
  clinical_case_id uuid REFERENCES public.nutrition_clinical_cases(id) ON DELETE SET NULL,
  pair_index integer NOT NULL DEFAULT 0,
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_score numeric,
  ai_feedback_json jsonb,
  admin_score numeric,
  admin_feedback text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can manage nutrition_responses" ON public.nutrition_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon can select nutrition_responses" ON public.nutrition_responses FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert nutrition_responses" ON public.nutrition_responses FOR INSERT TO anon WITH CHECK (true);

-- =============================================
-- DENTISTRY TABLES
-- =============================================

CREATE TABLE public.dentistry_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  description text,
  module_type text NOT NULL DEFAULT 'anamnese_odontologica',
  access_code text NOT NULL DEFAULT substr(md5(random()::text), 1, 6),
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dentistry_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage dentistry_rooms" ON public.dentistry_rooms FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anon can select active dentistry_rooms" ON public.dentistry_rooms FOR SELECT TO anon USING (status = 'active');

CREATE TABLE public.dentistry_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.dentistry_rooms(id) ON DELETE CASCADE NOT NULL,
  student_name text NOT NULL DEFAULT '',
  student_email text,
  pair_index integer NOT NULL DEFAULT -1,
  pair_position text NOT NULL DEFAULT 'X',
  participant_role text NOT NULL DEFAULT 'student',
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dentistry_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can manage dentistry_participants" ON public.dentistry_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon can select dentistry_participants" ON public.dentistry_participants FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert dentistry_participants" ON public.dentistry_participants FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update dentistry_participants" ON public.dentistry_participants FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE TABLE public.dentistry_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.dentistry_rooms(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT '',
  form_type text NOT NULL DEFAULT 'standard',
  content_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dentistry_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can manage dentistry_forms" ON public.dentistry_forms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon can select dentistry_forms" ON public.dentistry_forms FOR SELECT TO anon USING (true);

CREATE TABLE public.dentistry_clinical_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.dentistry_rooms(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT '',
  content text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dentistry_clinical_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can manage dentistry_clinical_cases" ON public.dentistry_clinical_cases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon can select dentistry_clinical_cases" ON public.dentistry_clinical_cases FOR SELECT TO anon USING (true);

CREATE TABLE public.dentistry_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.dentistry_rooms(id) ON DELETE CASCADE NOT NULL,
  form_id uuid REFERENCES public.dentistry_forms(id) ON DELETE CASCADE NOT NULL,
  clinical_case_id uuid REFERENCES public.dentistry_clinical_cases(id) ON DELETE SET NULL,
  pair_index integer NOT NULL DEFAULT 0,
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_score numeric,
  ai_feedback_json jsonb,
  admin_score numeric,
  admin_feedback text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dentistry_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can manage dentistry_responses" ON public.dentistry_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon can select dentistry_responses" ON public.dentistry_responses FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert dentistry_responses" ON public.dentistry_responses FOR INSERT TO anon WITH CHECK (true);
