
-- Drop partially created tables to start fresh
DROP TABLE IF EXISTS public.simulation_responses CASCADE;
DROP TABLE IF EXISTS public.simulation_round_assignments CASCADE;
DROP TABLE IF EXISTS public.simulation_rounds CASCADE;
DROP TABLE IF EXISTS public.simulation_forms CASCADE;
DROP TABLE IF EXISTS public.simulation_participants CASCADE;
DROP TABLE IF EXISTS public.simulation_rooms CASCADE;

-- simulation_rooms
CREATE TABLE public.simulation_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nova Simulação',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  duration_minutes INTEGER NOT NULL DEFAULT 10,
  access_code TEXT NOT NULL DEFAULT substring(md5(random()::text), 1, 6),
  current_round INTEGER NOT NULL DEFAULT 0,
  current_cycle INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.simulation_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all simulation_rooms" ON public.simulation_rooms FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can CRUD own simulation_rooms" ON public.simulation_rooms FOR ALL TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon can select rooms" ON public.simulation_rooms FOR SELECT TO anon, authenticated USING (true);

-- simulation_participants
CREATE TABLE public.simulation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.simulation_rooms(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL DEFAULT '',
  student_email TEXT DEFAULT '',
  pair_index INTEGER NOT NULL DEFAULT 0,
  pair_position TEXT NOT NULL DEFAULT 'A',
  participant_role TEXT NOT NULL DEFAULT 'student',
  assigned_role TEXT NOT NULL DEFAULT 'waiting',
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.simulation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all simulation_participants" ON public.simulation_participants FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can manage participants" ON public.simulation_participants FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.simulation_rooms r WHERE r.id = simulation_participants.room_id AND r.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.simulation_rooms r WHERE r.id = simulation_participants.room_id AND r.user_id = auth.uid()));
CREATE POLICY "Anon can select participants" ON public.simulation_participants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can update participants" ON public.simulation_participants FOR UPDATE TO anon, authenticated USING (true);

-- simulation_forms
CREATE TABLE public.simulation_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.simulation_rooms(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL DEFAULT 'anamnesis',
  title TEXT NOT NULL DEFAULT '',
  content_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.simulation_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all simulation_forms" ON public.simulation_forms FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can manage forms" ON public.simulation_forms FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.simulation_rooms r WHERE r.id = simulation_forms.room_id AND r.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.simulation_rooms r WHERE r.id = simulation_forms.room_id AND r.user_id = auth.uid()));
CREATE POLICY "Anon can select forms" ON public.simulation_forms FOR SELECT TO anon, authenticated USING (true);

-- simulation_rounds
CREATE TABLE public.simulation_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.simulation_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  cycle INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  released_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.simulation_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all simulation_rounds" ON public.simulation_rounds FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can manage rounds" ON public.simulation_rounds FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.simulation_rooms r WHERE r.id = simulation_rounds.room_id AND r.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.simulation_rooms r WHERE r.id = simulation_rounds.room_id AND r.user_id = auth.uid()));
CREATE POLICY "Anon can select rounds" ON public.simulation_rounds FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can update rounds" ON public.simulation_rounds FOR UPDATE TO anon, authenticated USING (true);

-- simulation_round_assignments
CREATE TABLE public.simulation_round_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.simulation_rounds(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.simulation_participants(id) ON DELETE CASCADE,
  assigned_role TEXT NOT NULL DEFAULT 'observer',
  pair_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.simulation_round_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all simulation_round_assignments" ON public.simulation_round_assignments FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can manage assignments" ON public.simulation_round_assignments FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.simulation_rounds r JOIN public.simulation_rooms rm ON rm.id = r.room_id WHERE rm.user_id = auth.uid() AND r.id = simulation_round_assignments.round_id)) WITH CHECK (EXISTS (SELECT 1 FROM public.simulation_rounds r JOIN public.simulation_rooms rm ON rm.id = r.room_id WHERE rm.user_id = auth.uid() AND r.id = simulation_round_assignments.round_id));
CREATE POLICY "Anon can select assignments" ON public.simulation_round_assignments FOR SELECT TO anon, authenticated USING (true);

-- simulation_responses
CREATE TABLE public.simulation_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.simulation_rounds(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.simulation_participants(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES public.simulation_forms(id) ON DELETE CASCADE,
  answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.simulation_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all simulation_responses" ON public.simulation_responses FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can manage responses" ON public.simulation_responses FOR ALL TO public USING (EXISTS (SELECT 1 FROM public.simulation_rounds r JOIN public.simulation_rooms rm ON rm.id = r.room_id WHERE rm.user_id = auth.uid() AND r.id = simulation_responses.round_id)) WITH CHECK (EXISTS (SELECT 1 FROM public.simulation_rounds r JOIN public.simulation_rooms rm ON rm.id = r.room_id WHERE rm.user_id = auth.uid() AND r.id = simulation_responses.round_id));
CREATE POLICY "Anon can select responses" ON public.simulation_responses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can insert responses" ON public.simulation_responses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can update responses" ON public.simulation_responses FOR UPDATE TO anon, authenticated USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.simulation_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.simulation_responses;
