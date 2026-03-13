
-- OSCE Exams
CREATE TABLE public.osce_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Exame OSCE',
  description text DEFAULT '',
  station_duration_minutes integer NOT NULL DEFAULT 5,
  transition_seconds integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.osce_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own osce_exams" ON public.osce_exams FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all osce_exams" ON public.osce_exams FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_osce_exams_updated_at BEFORE UPDATE ON public.osce_exams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- OSCE Stations
CREATE TABLE public.osce_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  osce_exam_id uuid NOT NULL REFERENCES public.osce_exams(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT 'Estação',
  duration_minutes integer,
  student_instructions text DEFAULT '',
  patient_script text DEFAULT '',
  case_summary text DEFAULT '',
  learning_objectives text[] DEFAULT '{}',
  virtual_patient_enabled boolean NOT NULL DEFAULT false,
  virtual_patient_system_prompt text DEFAULT '',
  is_rest_station boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.osce_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage stations via exam ownership" ON public.osce_stations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.osce_exams WHERE id = osce_stations.osce_exam_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.osce_exams WHERE id = osce_stations.osce_exam_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage all osce_stations" ON public.osce_stations FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_osce_stations_updated_at BEFORE UPDATE ON public.osce_stations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- OSCE Checklist Items
CREATE TABLE public.osce_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.osce_stations(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'binary',
  likert_max integer DEFAULT 5,
  max_points numeric NOT NULL DEFAULT 1,
  weight numeric NOT NULL DEFAULT 1,
  is_critical boolean NOT NULL DEFAULT false,
  category text DEFAULT 'Geral'
);

ALTER TABLE public.osce_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage checklist via station ownership" ON public.osce_checklist_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.osce_stations s JOIN public.osce_exams e ON e.id = s.osce_exam_id WHERE s.id = osce_checklist_items.station_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.osce_stations s JOIN public.osce_exams e ON e.id = s.osce_exam_id WHERE s.id = osce_checklist_items.station_id AND e.user_id = auth.uid()));
CREATE POLICY "Admins can manage all osce_checklist_items" ON public.osce_checklist_items FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- OSCE Circuits
CREATE TABLE public.osce_circuits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  osce_exam_id uuid NOT NULL REFERENCES public.osce_exams(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id),
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  current_rotation integer NOT NULL DEFAULT 0,
  access_code text NOT NULL DEFAULT substring(md5(random()::text), 1, 6),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE public.osce_circuits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own osce_circuits" ON public.osce_circuits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all osce_circuits" ON public.osce_circuits FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_osce_circuits_updated_at BEFORE UPDATE ON public.osce_circuits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- OSCE Evaluations
CREATE TABLE public.osce_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id uuid NOT NULL REFERENCES public.osce_circuits(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES public.osce_stations(id) ON DELETE CASCADE,
  evaluator_id uuid,
  student_name text NOT NULL DEFAULT '',
  student_email text,
  rotation integer NOT NULL DEFAULT 0,
  observations text DEFAULT '',
  total_score numeric DEFAULT 0,
  max_score numeric DEFAULT 0,
  passed boolean DEFAULT true,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.osce_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage evaluations via circuit ownership" ON public.osce_evaluations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.osce_circuits WHERE id = osce_evaluations.circuit_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.osce_circuits WHERE id = osce_evaluations.circuit_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage all osce_evaluations" ON public.osce_evaluations FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- OSCE Evaluation Items
CREATE TABLE public.osce_evaluation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.osce_evaluations(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES public.osce_checklist_items(id) ON DELETE CASCADE,
  value numeric NOT NULL DEFAULT 0,
  notes text DEFAULT ''
);

ALTER TABLE public.osce_evaluation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage eval items via evaluation ownership" ON public.osce_evaluation_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.osce_evaluations ev JOIN public.osce_circuits c ON c.id = ev.circuit_id WHERE ev.id = osce_evaluation_items.evaluation_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.osce_evaluations ev JOIN public.osce_circuits c ON c.id = ev.circuit_id WHERE ev.id = osce_evaluation_items.evaluation_id AND c.user_id = auth.uid()));
CREATE POLICY "Admins can manage all osce_evaluation_items" ON public.osce_evaluation_items FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Enable Realtime for circuits and evaluations
ALTER PUBLICATION supabase_realtime ADD TABLE public.osce_circuits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.osce_evaluations;
