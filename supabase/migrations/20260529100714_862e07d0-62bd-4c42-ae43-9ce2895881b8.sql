
-- =====================================================================
-- TURMA → SEMESTRE refactor + Professors + Documents + Class schedule
-- =====================================================================

-- 1. SEMESTERS -----------------------------------------------------------
CREATE TABLE public.class_semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  label text NOT NULL,
  start_date date,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_class_semesters_class ON public.class_semesters(class_id);

GRANT SELECT ON public.class_semesters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_semesters TO authenticated;
GRANT ALL ON public.class_semesters TO service_role;

ALTER TABLE public.class_semesters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage semesters" ON public.class_semesters
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.user_id = auth.uid()));

CREATE POLICY "Admins manage semesters" ON public.class_semesters
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- anon read allowed for VP/PIN flows that need to resolve semester label
CREATE POLICY "Anon read semesters for active VP" ON public.class_semesters
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.class_virtual_patients cvp
    WHERE cvp.class_id = class_semesters.class_id AND cvp.status = 'active'
  ));

CREATE TRIGGER trg_class_semesters_updated
  BEFORE UPDATE ON public.class_semesters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. TEACHERS ------------------------------------------------------------
CREATE TABLE public.class_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'titular',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_class_teachers_class ON public.class_teachers(class_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_teachers TO authenticated;
GRANT ALL ON public.class_teachers TO service_role;

ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage teachers" ON public.class_teachers
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.user_id = auth.uid()));
CREATE POLICY "Admins manage teachers" ON public.class_teachers
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_class_teachers_updated
  BEFORE UPDATE ON public.class_teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. DOCUMENTS -----------------------------------------------------------
CREATE TABLE public.class_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  description text,
  file_path text,
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_class_documents_class ON public.class_documents(class_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_documents TO authenticated;
GRANT ALL ON public.class_documents TO service_role;

ALTER TABLE public.class_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage documents" ON public.class_documents
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.user_id = auth.uid()));
CREATE POLICY "Admins manage documents" ON public.class_documents
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_class_documents_updated
  BEFORE UPDATE ON public.class_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('class-documents','class-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Owners read class docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'class-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners write class docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'class-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners update class docs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'class-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners delete class docs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'class-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. LESSON TEMPLATES ----------------------------------------------------
CREATE TABLE public.class_lesson_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  lesson_type text NOT NULL,
  schema jsonb NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_class_lesson_templates_user ON public.class_lesson_templates(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_lesson_templates TO authenticated;
GRANT ALL ON public.class_lesson_templates TO service_role;

ALTER TABLE public.class_lesson_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads templates" ON public.class_lesson_templates
  FOR SELECT TO authenticated USING (is_system = true OR user_id = auth.uid());
CREATE POLICY "Users manage own templates" ON public.class_lesson_templates
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND is_system = false)
  WITH CHECK (user_id = auth.uid() AND is_system = false);
CREATE POLICY "Admins manage all templates" ON public.class_lesson_templates
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_class_lesson_templates_updated
  BEFORE UPDATE ON public.class_lesson_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. SCHEDULE ITEMS (lessons) -------------------------------------------
CREATE TABLE public.class_schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id uuid NOT NULL REFERENCES public.class_semesters(id) ON DELETE CASCADE,
  lesson_date date,
  title text NOT NULL,
  lesson_type text NOT NULL DEFAULT 'other',
  template_id uuid REFERENCES public.class_lesson_templates(id) ON DELETE SET NULL,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  status text NOT NULL DEFAULT 'planned',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_class_schedule_semester ON public.class_schedule_items(semester_id);
CREATE INDEX idx_class_schedule_date ON public.class_schedule_items(lesson_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_schedule_items TO authenticated;
GRANT ALL ON public.class_schedule_items TO service_role;

ALTER TABLE public.class_schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage schedule" ON public.class_schedule_items
  USING (EXISTS (
    SELECT 1 FROM public.class_semesters s
    JOIN public.classes c ON c.id = s.class_id
    WHERE s.id = semester_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.class_semesters s
    JOIN public.classes c ON c.id = s.class_id
    WHERE s.id = semester_id AND c.user_id = auth.uid()));
CREATE POLICY "Admins manage schedule" ON public.class_schedule_items
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_class_schedule_items_updated
  BEFORE UPDATE ON public.class_schedule_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. ADD semester_id to existing tables ---------------------------------
ALTER TABLE public.class_students        ADD COLUMN semester_id uuid REFERENCES public.class_semesters(id) ON DELETE SET NULL;
ALTER TABLE public.class_virtual_patients ADD COLUMN semester_id uuid REFERENCES public.class_semesters(id) ON DELETE SET NULL;
ALTER TABLE public.exams                 ADD COLUMN semester_id uuid REFERENCES public.class_semesters(id) ON DELETE SET NULL;
ALTER TABLE public.osce_exams            ADD COLUMN semester_id uuid REFERENCES public.class_semesters(id) ON DELETE SET NULL;
ALTER TABLE public.kfe_exams             ADD COLUMN semester_id uuid REFERENCES public.class_semesters(id) ON DELETE SET NULL;
ALTER TABLE public.sct_exams             ADD COLUMN semester_id uuid REFERENCES public.class_semesters(id) ON DELETE SET NULL;
ALTER TABLE public.sjt_exams             ADD COLUMN semester_id uuid REFERENCES public.class_semesters(id) ON DELETE SET NULL;
ALTER TABLE public.clinical_observations ADD COLUMN semester_id uuid REFERENCES public.class_semesters(id) ON DELETE SET NULL;
ALTER TABLE public.osce_circuits         ADD COLUMN semester_id uuid REFERENCES public.class_semesters(id) ON DELETE SET NULL;

-- 7. SEED system templates ----------------------------------------------
INSERT INTO public.class_lesson_templates (user_id, name, lesson_type, is_system, schema) VALUES
(NULL, 'Aula teórica', 'theoretical', true, '{"sections":[
  {"id":"obj","label":"Objetivos de aprendizagem","fields":[{"id":"objetivos","label":"Objetivos","type":"textarea"}]},
  {"id":"cont","label":"Conteúdo programático","fields":[{"id":"conteudo","label":"Conteúdo","type":"textarea"}]},
  {"id":"met","label":"Metodologia","fields":[{"id":"metodologia","label":"Metodologia","type":"textarea"},{"id":"recursos","label":"Recursos","type":"textarea"}]},
  {"id":"bib","label":"Bibliografia","fields":[{"id":"bibliografia","label":"Bibliografia","type":"textarea"}]},
  {"id":"aval","label":"Avaliação formativa","fields":[{"id":"avaliacao","label":"Avaliação","type":"textarea"}]},
  {"id":"pos","label":"Anotações pós-aula","fields":[{"id":"anotacoes","label":"Anotações","type":"textarea"}]}
]}'::jsonb),
(NULL, 'Aula prática', 'practical', true, '{"sections":[
  {"id":"obj","label":"Objetivos","fields":[{"id":"objetivos","label":"Objetivos","type":"textarea"}]},
  {"id":"mat","label":"Materiais e equipamentos","fields":[{"id":"materiais","label":"Materiais","type":"textarea"}]},
  {"id":"rot","label":"Roteiro de atividades","fields":[{"id":"roteiro","label":"Roteiro passo a passo","type":"textarea"}]},
  {"id":"seg","label":"Normas de segurança","fields":[{"id":"seguranca","label":"Segurança","type":"textarea"}]},
  {"id":"prod","label":"Produto esperado","fields":[{"id":"produto","label":"Produto","type":"textarea"}]},
  {"id":"aval","label":"Avaliação","fields":[{"id":"avaliacao","label":"Critérios","type":"textarea"}]},
  {"id":"pos","label":"Anotações pós-aula","fields":[{"id":"anotacoes","label":"Anotações","type":"textarea"}]}
]}'::jsonb),
(NULL, 'Simulação', 'simulation', true, '{"sections":[
  {"id":"cen","label":"Cenário clínico","fields":[{"id":"cenario","label":"Cenário","type":"textarea"}]},
  {"id":"brief","label":"Briefing","fields":[{"id":"briefing","label":"Briefing","type":"textarea"}]},
  {"id":"obj","label":"Objetivos","fields":[{"id":"objetivos","label":"Objetivos","type":"textarea"}]},
  {"id":"pap","label":"Papéis dos alunos","fields":[{"id":"papeis","label":"Papéis","type":"textarea"}]},
  {"id":"check","label":"Checklist de avaliação","fields":[{"id":"checklist","label":"Checklist","type":"textarea"}]},
  {"id":"deb","label":"Debriefing","fields":[{"id":"debriefing","label":"Debriefing","type":"textarea"}]},
  {"id":"pos","label":"Anotações pós-aula","fields":[{"id":"anotacoes","label":"Anotações","type":"textarea"}]}
]}'::jsonb),
(NULL, 'Seminário / Caso clínico', 'seminar', true, '{"sections":[
  {"id":"tema","label":"Tema","fields":[{"id":"tema","label":"Tema","type":"text"}]},
  {"id":"grp","label":"Grupos / Apresentadores","fields":[{"id":"grupos","label":"Grupos","type":"textarea"}]},
  {"id":"caso","label":"Roteiro do caso","fields":[{"id":"caso","label":"Caso clínico","type":"textarea"}]},
  {"id":"cri","label":"Critérios de avaliação","fields":[{"id":"criterios","label":"Critérios","type":"textarea"}]},
  {"id":"per","label":"Perguntas norteadoras","fields":[{"id":"perguntas","label":"Perguntas","type":"textarea"}]},
  {"id":"pos","label":"Anotações pós-aula","fields":[{"id":"anotacoes","label":"Anotações","type":"textarea"}]}
]}'::jsonb),
(NULL, 'Avaliação / Prova', 'assessment', true, '{"sections":[
  {"id":"tipo","label":"Tipo de avaliação","fields":[{"id":"tipo","label":"Tipo","type":"text"}]},
  {"id":"cont","label":"Conteúdos cobrados","fields":[{"id":"conteudos","label":"Conteúdos","type":"textarea"}]},
  {"id":"inst","label":"Instrumento","fields":[{"id":"instrumento","label":"Instrumento (prova escrita, OSCE, etc.)","type":"textarea"}]},
  {"id":"peso","label":"Peso e nota","fields":[{"id":"peso","label":"Peso","type":"text"}]},
  {"id":"obs","label":"Observações","fields":[{"id":"observacoes","label":"Observações","type":"textarea"}]}
]}'::jsonb),
(NULL, 'Livre', 'other', true, '{"sections":[
  {"id":"notas","label":"Anotações","fields":[{"id":"anotacoes","label":"Anotações","type":"textarea"}]}
]}'::jsonb);
