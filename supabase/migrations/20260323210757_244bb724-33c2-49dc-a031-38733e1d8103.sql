
-- =====================================================
-- Nursing Simulation Tables (Enfermagem Clínica)
-- =====================================================

-- 1. nursing_rooms
CREATE TABLE public.nursing_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_type TEXT NOT NULL DEFAULT 'acolhimento',
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  access_code TEXT NOT NULL DEFAULT substr(md5(random()::text), 1, 6),
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nursing_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nursing rooms" ON public.nursing_rooms FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create nursing rooms" ON public.nursing_rooms FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own nursing rooms" ON public.nursing_rooms FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own nursing rooms" ON public.nursing_rooms FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_nursing_rooms_updated_at BEFORE UPDATE ON public.nursing_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. nursing_participants
CREATE TABLE public.nursing_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.nursing_rooms(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL DEFAULT '',
  student_email TEXT,
  pair_index INTEGER NOT NULL DEFAULT -1,
  pair_position TEXT NOT NULL DEFAULT 'X',
  participant_role TEXT NOT NULL DEFAULT 'student',
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nursing_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view nursing participants via room ownership" ON public.nursing_participants FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.nursing_rooms WHERE id = room_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert nursing participants via room ownership" ON public.nursing_participants FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.nursing_rooms WHERE id = room_id AND user_id = auth.uid()));
CREATE POLICY "Users can update nursing participants via room ownership" ON public.nursing_participants FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.nursing_rooms WHERE id = room_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete nursing participants via room ownership" ON public.nursing_participants FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.nursing_rooms WHERE id = room_id AND user_id = auth.uid()));
CREATE POLICY "Anon can view nursing participants" ON public.nursing_participants FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can update nursing participants" ON public.nursing_participants FOR UPDATE TO anon USING (true);

-- 3. nursing_forms
CREATE TABLE public.nursing_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.nursing_rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  form_type TEXT NOT NULL DEFAULT 'standard',
  content_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nursing_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view nursing forms via room ownership" ON public.nursing_forms FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.nursing_rooms WHERE id = room_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert nursing forms via room ownership" ON public.nursing_forms FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.nursing_rooms WHERE id = room_id AND user_id = auth.uid()));
CREATE POLICY "Users can update nursing forms via room ownership" ON public.nursing_forms FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.nursing_rooms WHERE id = room_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete nursing forms via room ownership" ON public.nursing_forms FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.nursing_rooms WHERE id = room_id AND user_id = auth.uid()));
CREATE POLICY "Anon can view nursing forms" ON public.nursing_forms FOR SELECT TO anon USING (true);

-- 4. nursing_clinical_cases
CREATE TABLE public.nursing_clinical_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.nursing_rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nursing_clinical_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view nursing cases via room ownership" ON public.nursing_clinical_cases FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.nursing_rooms WHERE id = room_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert nursing cases via room ownership" ON public.nursing_clinical_cases FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.nursing_rooms WHERE id = room_id AND user_id = auth.uid()));
CREATE POLICY "Users can update nursing cases via room ownership" ON public.nursing_clinical_cases FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.nursing_rooms WHERE id = room_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete nursing cases via room ownership" ON public.nursing_clinical_cases FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.nursing_rooms WHERE id = room_id AND user_id = auth.uid()));
CREATE POLICY "Anon can view nursing cases" ON public.nursing_clinical_cases FOR SELECT TO anon USING (true);

-- 5. nursing_responses
CREATE TABLE public.nursing_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.nursing_rooms(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES public.nursing_forms(id) ON DELETE CASCADE,
  clinical_case_id UUID REFERENCES public.nursing_clinical_cases(id) ON DELETE SET NULL,
  pair_index INTEGER NOT NULL DEFAULT 0,
  answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMP WITH TIME ZONE,
  ai_score NUMERIC,
  ai_feedback_json JSONB,
  admin_score NUMERIC,
  admin_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nursing_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view nursing responses via room ownership" ON public.nursing_responses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.nursing_rooms WHERE id = room_id AND user_id = auth.uid()));
CREATE POLICY "Users can update nursing responses via room ownership" ON public.nursing_responses FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.nursing_rooms WHERE id = room_id AND user_id = auth.uid()));
CREATE POLICY "Anon can view nursing responses" ON public.nursing_responses FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert nursing responses" ON public.nursing_responses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update nursing responses" ON public.nursing_responses FOR UPDATE TO anon USING (true);
