
-- New table: osce_station_evaluators
CREATE TABLE public.osce_station_evaluators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.osce_stations(id) ON DELETE CASCADE,
  evaluator_name text NOT NULL DEFAULT '',
  evaluator_email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.osce_station_evaluators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all osce_station_evaluators" ON public.osce_station_evaluators FOR ALL TO public
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage evaluators via station ownership" ON public.osce_station_evaluators FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM osce_stations s JOIN osce_exams e ON e.id = s.osce_exam_id WHERE s.id = osce_station_evaluators.station_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM osce_stations s JOIN osce_exams e ON e.id = s.osce_exam_id WHERE s.id = osce_station_evaluators.station_id AND e.user_id = auth.uid()));

CREATE POLICY "Anon can select evaluators via access code" ON public.osce_station_evaluators FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM osce_stations s
    JOIN osce_exams e ON e.id = s.osce_exam_id
    JOIN osce_circuits c ON c.osce_exam_id = e.id
    WHERE s.id = osce_station_evaluators.station_id
  ));

-- New table: osce_circuit_students
CREATE TABLE public.osce_circuit_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id uuid NOT NULL REFERENCES public.osce_circuits(id) ON DELETE CASCADE,
  student_name text NOT NULL DEFAULT '',
  student_email text DEFAULT '',
  student_registration text,
  current_station_id uuid REFERENCES public.osce_stations(id) ON DELETE SET NULL,
  current_rotation int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.osce_circuit_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all osce_circuit_students" ON public.osce_circuit_students FOR ALL TO public
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage students via circuit ownership" ON public.osce_circuit_students FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM osce_circuits c WHERE c.id = osce_circuit_students.circuit_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM osce_circuits c WHERE c.id = osce_circuit_students.circuit_id AND c.user_id = auth.uid()));

CREATE POLICY "Anon can select circuit students via access code" ON public.osce_circuit_students FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM osce_circuits c WHERE c.id = osce_circuit_students.circuit_id));

-- New table: osce_station_materials
CREATE TABLE public.osce_station_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.osce_stations(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'other',
  content text DEFAULT '',
  file_url text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.osce_station_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all osce_station_materials" ON public.osce_station_materials FOR ALL TO public
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage materials via station ownership" ON public.osce_station_materials FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM osce_stations s JOIN osce_exams e ON e.id = s.osce_exam_id WHERE s.id = osce_station_materials.station_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM osce_stations s JOIN osce_exams e ON e.id = s.osce_exam_id WHERE s.id = osce_station_materials.station_id AND e.user_id = auth.uid()));

CREATE POLICY "Anon can select materials" ON public.osce_station_materials FOR SELECT TO anon, authenticated
  USING (true);

-- Alter osce_exams: add is_online and class_id
ALTER TABLE public.osce_exams ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false;
ALTER TABLE public.osce_exams ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

-- Enable realtime for osce_circuit_students
ALTER PUBLICATION supabase_realtime ADD TABLE public.osce_circuit_students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.osce_station_evaluators;

-- Storage bucket for materials
INSERT INTO storage.buckets (id, name, public) VALUES ('osce-materials', 'osce-materials', true) ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Authenticated users can upload osce materials" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'osce-materials');
CREATE POLICY "Anyone can view osce materials" ON storage.objects FOR SELECT TO public USING (bucket_id = 'osce-materials');
CREATE POLICY "Authenticated users can delete own osce materials" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'osce-materials');
