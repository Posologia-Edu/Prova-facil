-- Documentação v2, etapa 4: revisão cruzada entre duplas, em tabela PRIVADA.
-- A resposta de uma dupla só chega a outra pela função doc-v2-revisao, depois que a dupla revisora enviou a própria resposta.
-- Só o dono da sala e o admin leem e escrevem; NÃO há política para anon.
CREATE TABLE IF NOT EXISTS public.documentation_v2_revisoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.documentation_rooms(id) ON DELETE CASCADE,
  reviewer_pair integer NOT NULL,
  reviewed_pair integer NOT NULL,
  reviewed_response_id uuid REFERENCES public.documentation_v2_respostas(id) ON DELETE SET NULL,
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, reviewer_pair)
);

CREATE INDEX IF NOT EXISTS idx_documentation_v2_revisoes_room ON public.documentation_v2_revisoes(room_id);

ALTER TABLE public.documentation_v2_revisoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all documentation_v2_revisoes" ON public.documentation_v2_revisoes FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can manage documentation_v2_revisoes" ON public.documentation_v2_revisoes FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM public.documentation_rooms r WHERE r.id = documentation_v2_revisoes.room_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.documentation_rooms r WHERE r.id = documentation_v2_revisoes.room_id AND r.user_id = auth.uid()));
