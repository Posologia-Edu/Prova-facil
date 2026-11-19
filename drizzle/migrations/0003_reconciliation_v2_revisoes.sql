-- Reconciliação v2, etapa 3b: revisão cruzada entre duplas, em tabela PRIVADA.
-- A resposta de uma dupla só chega a outra por função (recon-v2-revisao), depois que o revisor envia a própria resposta final.
-- Só o dono da sala e o admin leem e escrevem; NÃO há política para anon.
CREATE TABLE IF NOT EXISTS public.reconciliation_v2_revisoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.reconciliation_rooms(id) ON DELETE CASCADE,
  reviewer_pair integer NOT NULL,
  reviewed_pair integer NOT NULL,
  reviewed_response_id uuid NOT NULL REFERENCES public.reconciliation_responses(id) ON DELETE CASCADE,
  form_id uuid REFERENCES public.reconciliation_forms(id) ON DELETE SET NULL,
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, reviewer_pair)
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_v2_revisoes_room ON public.reconciliation_v2_revisoes(room_id);

ALTER TABLE public.reconciliation_v2_revisoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reconciliation_v2_revisoes" ON public.reconciliation_v2_revisoes FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can manage reconciliation_v2_revisoes" ON public.reconciliation_v2_revisoes FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM public.reconciliation_rooms r WHERE r.id = reconciliation_v2_revisoes.room_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reconciliation_rooms r WHERE r.id = reconciliation_v2_revisoes.room_id AND r.user_id = auth.uid()));