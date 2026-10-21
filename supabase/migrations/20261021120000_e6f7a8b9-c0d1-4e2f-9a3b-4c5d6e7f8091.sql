-- Pacientes Virtuais · P20: ficha eletrônica do atendimento (anamnese no 1º encontro, SBAR no 2º, SOAP no 3º).
-- Uma linha por seção, para dois integrantes do grupo editarem seções diferentes sem sobrescrever um ao outro.
-- A ficha fica na sessão primária (a mesma que guarda o chat do grupo). Alunos entram sem login, então o
-- acesso segue o mesmo padrão de virtual_patient_messages.
CREATE TABLE IF NOT EXISTS public.virtual_patient_record_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.virtual_patient_sessions(id) ON DELETE CASCADE,
  encounter integer NOT NULL CHECK (encounter BETWEEN 1 AND 3),
  section_key text NOT NULL,
  content text NOT NULL DEFAULT '',
  updated_by_email text,
  updated_by_name text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, encounter, section_key)
);

CREATE INDEX IF NOT EXISTS idx_vp_record_sections_session ON public.virtual_patient_record_sections(session_id);

ALTER TABLE public.virtual_patient_record_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can select record sections" ON public.virtual_patient_record_sections
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can insert record sections" ON public.virtual_patient_record_sections
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can update record sections" ON public.virtual_patient_record_sections
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage all record sections" ON public.virtual_patient_record_sections
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
