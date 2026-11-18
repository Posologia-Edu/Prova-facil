-- Reconciliação v2, etapa 3a: conversa da dupla com o prescritor virtual, em tabela PRIVADA.
-- O desfecho por discrepância (aceita, adia, recusa) revela o gabarito, então a resposta (legível por anon) não o guarda.
-- Só o dono da sala e o admin leem; o aluno usa a função recon-v2-prescritor (service role).
CREATE TABLE IF NOT EXISTS public.reconciliation_v2_prescritor (
  response_id uuid PRIMARY KEY REFERENCES public.reconciliation_responses(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.reconciliation_rooms(id) ON DELETE CASCADE,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_v2_prescritor_room ON public.reconciliation_v2_prescritor(room_id);

ALTER TABLE public.reconciliation_v2_prescritor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reconciliation_v2_prescritor" ON public.reconciliation_v2_prescritor FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can manage reconciliation_v2_prescritor" ON public.reconciliation_v2_prescritor FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM public.reconciliation_rooms r WHERE r.id = reconciliation_v2_prescritor.room_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reconciliation_rooms r WHERE r.id = reconciliation_v2_prescritor.room_id AND r.user_id = auth.uid()));
