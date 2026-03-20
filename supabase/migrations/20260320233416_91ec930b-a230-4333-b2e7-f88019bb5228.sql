
-- virtual_patient_sessions
CREATE TABLE public.virtual_patient_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  patient_id text NOT NULL,
  module text NOT NULL DEFAULT 'pain',
  current_encounter integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'in_progress',
  mai_answers_json jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.virtual_patient_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert sessions" ON public.virtual_patient_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can select sessions" ON public.virtual_patient_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can update sessions" ON public.virtual_patient_sessions FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage all vp_sessions" ON public.virtual_patient_sessions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- virtual_patient_messages
CREATE TABLE public.virtual_patient_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.virtual_patient_sessions(id) ON DELETE CASCADE,
  encounter integer NOT NULL DEFAULT 1,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.virtual_patient_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert messages" ON public.virtual_patient_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can select messages" ON public.virtual_patient_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage all vp_messages" ON public.virtual_patient_messages FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- virtual_patient_mai_scores
CREATE TABLE public.virtual_patient_mai_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.virtual_patient_sessions(id) ON DELETE CASCADE,
  mai_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.virtual_patient_mai_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert mai_scores" ON public.virtual_patient_mai_scores FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can select mai_scores" ON public.virtual_patient_mai_scores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage all mai_scores" ON public.virtual_patient_mai_scores FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
