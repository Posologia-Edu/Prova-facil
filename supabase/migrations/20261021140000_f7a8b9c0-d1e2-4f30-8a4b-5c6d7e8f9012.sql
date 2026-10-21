-- Pacientes Virtuais: divisão de funções no grupo (um conduz a conversa, outro registra a ficha), com rodízio.
-- O docente liga por paciente da turma (padrão desligado); o grupo escolhe quem registra a ficha em cada
-- encontro, e quem não registra conduz a conversa. As escolhas ficam na sessão primária do grupo.
ALTER TABLE public.class_virtual_patients
  ADD COLUMN IF NOT EXISTS group_roles boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.virtual_patient_encounter_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.virtual_patient_sessions(id) ON DELETE CASCADE,
  encounter integer NOT NULL CHECK (encounter BETWEEN 1 AND 3),
  registrars text[] NOT NULL DEFAULT '{}',
  chosen_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, encounter)
);

ALTER TABLE public.virtual_patient_encounter_roles ENABLE ROW LEVEL SECURITY;

-- Alunos entram sem login: mesmo padrão de virtual_patient_messages e das seções da ficha.
CREATE POLICY "Anon can select encounter roles" ON public.virtual_patient_encounter_roles
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anon can insert encounter roles" ON public.virtual_patient_encounter_roles
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anon can update encounter roles" ON public.virtual_patient_encounter_roles
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage all encounter roles" ON public.virtual_patient_encounter_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
