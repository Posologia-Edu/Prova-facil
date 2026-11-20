-- Documentação v2, etapa 3: paciente virtual de aconselhamento.
-- 1) A sala decide se usa o paciente (as salas v2 já criadas continuam sem).
ALTER TABLE public.documentation_rooms ADD COLUMN IF NOT EXISTS usa_paciente boolean NOT NULL DEFAULT false;

-- 2) Marca de conclusão do aconselhamento da dupla (conversa encerrada e checklist do observador enviado).
ALTER TABLE public.documentation_v2_respostas ADD COLUMN IF NOT EXISTS aconselhamento_concluido_at timestamptz;

-- 3) A conversa com o paciente, a medida de compreensão e o checklist do observador. Tabela PRIVADA, sem política para anon:
-- o aluno só chega a ela pela função doc-v2-paciente, que devolve apenas as falas do paciente.
CREATE TABLE IF NOT EXISTS public.documentation_v2_paciente (
  response_id uuid PRIMARY KEY REFERENCES public.documentation_v2_respostas(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.documentation_rooms(id) ON DELETE CASCADE,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentation_v2_paciente_room ON public.documentation_v2_paciente(room_id);

ALTER TABLE public.documentation_v2_paciente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all documentation_v2_paciente" ON public.documentation_v2_paciente FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can manage documentation_v2_paciente" ON public.documentation_v2_paciente FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM public.documentation_rooms r WHERE r.id = documentation_v2_paciente.room_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.documentation_rooms r WHERE r.id = documentation_v2_paciente.room_id AND r.user_id = auth.uid()));
