-- Documentação v2, etapa 2: avaliação (rubrica de 10 critérios). Tabela PRIVADA, sem política para anon.
-- A IA sugere; o professor confirma e libera. O aluno só recebe a devolutiva pela função doc-v2-devolutiva.
CREATE TABLE IF NOT EXISTS public.documentation_v2_avaliacoes (
  response_id uuid PRIMARY KEY REFERENCES public.documentation_v2_respostas(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.documentation_rooms(id) ON DELETE CASCADE,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  nota numeric,
  confirmada boolean NOT NULL DEFAULT false,
  liberada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentation_v2_avaliacoes_room ON public.documentation_v2_avaliacoes(room_id);

ALTER TABLE public.documentation_v2_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all documentation_v2_avaliacoes" ON public.documentation_v2_avaliacoes FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can manage documentation_v2_avaliacoes" ON public.documentation_v2_avaliacoes FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM public.documentation_rooms r WHERE r.id = documentation_v2_avaliacoes.room_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.documentation_rooms r WHERE r.id = documentation_v2_avaliacoes.room_id AND r.user_id = auth.uid()));
