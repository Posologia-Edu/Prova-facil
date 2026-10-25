-- Vínculo genérico entre uma Turma e qualquer atividade do sistema (OSCE, simulações, formulários).
-- Uma tabela só: não altera nenhuma tabela existente. Provas e Pacientes Virtuais continuam com os vínculos próprios.
-- O Júri Simulado fica de fora por enquanto (entra depois do evento de 30/10 com uma migração que amplia o CHECK).

CREATE TABLE IF NOT EXISTS public.class_activity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN (
    'osce',
    'simulation_anamnese', 'simulation_soap', 'simulation_reconciliation', 'simulation_documentation',
    'nursing', 'nutrition', 'dentistry', 'medicine', 'physiotherapy', 'biomedicine',
    'sct', 'kfe', 'sjt', 'progress_test', 'clinical_observation'
  )),
  activity_id uuid NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, activity_type, activity_id)
);

CREATE INDEX IF NOT EXISTS class_activity_links_class_idx ON public.class_activity_links (class_id);
CREATE INDEX IF NOT EXISTS class_activity_links_activity_idx ON public.class_activity_links (activity_type, activity_id);

ALTER TABLE public.class_activity_links ENABLE ROW LEVEL SECURITY;

-- O dono da turma gerencia os vínculos
CREATE POLICY "Owner can manage class_activity_links"
  ON public.class_activity_links FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_activity_links.class_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_activity_links.class_id AND c.user_id = auth.uid()));

-- Administradores têm acesso total
CREATE POLICY "Admins can manage all class_activity_links"
  ON public.class_activity_links FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
