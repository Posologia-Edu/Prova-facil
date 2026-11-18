-- Reconciliação v2, etapa 2: avaliação detalhada (matriz de discrepâncias, rubrica, justificativas) em tabela PRIVADA.
-- Só o dono da sala e o admin leem e escrevem. NÃO há política para anon: o aluno recebe a devolutiva por função no
-- servidor, e só depois que o professor confirma e libera. A função de correção (service role) grava aqui.
CREATE TABLE IF NOT EXISTS public.reconciliation_v2_avaliacoes (
  response_id uuid PRIMARY KEY REFERENCES public.reconciliation_responses(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.reconciliation_rooms(id) ON DELETE CASCADE,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  confirmada boolean NOT NULL DEFAULT false,
  liberada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_v2_avaliacoes_room ON public.reconciliation_v2_avaliacoes(room_id);

ALTER TABLE public.reconciliation_v2_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reconciliation_v2_avaliacoes" ON public.reconciliation_v2_avaliacoes FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can manage reconciliation_v2_avaliacoes" ON public.reconciliation_v2_avaliacoes FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM public.reconciliation_rooms r WHERE r.id = reconciliation_v2_avaliacoes.room_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reconciliation_rooms r WHERE r.id = reconciliation_v2_avaliacoes.room_id AND r.user_id = auth.uid()));

-- Tempo sugerido por etapa, em minutos (opcional; só avisa o aluno, não bloqueia).
ALTER TABLE public.reconciliation_rooms ADD COLUMN IF NOT EXISTS tempo_etapa_min integer;
