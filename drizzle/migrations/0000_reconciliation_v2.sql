-- Reconciliação v2, etapa 1.
-- 1) Marca de versão da sala (v1 por padrão: as salas existentes não mudam).
ALTER TABLE public.reconciliation_rooms ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;

-- 2) O dossiê que o aluno lê (sem prescrição e sem gabarito).
ALTER TABLE public.reconciliation_clinical_cases ADD COLUMN IF NOT EXISTS caso_json jsonb;

-- 3) A BPMH enviada e travada, e as fontes que a dupla abriu.
ALTER TABLE public.reconciliation_responses
  ADD COLUMN IF NOT EXISTS bpmh_json jsonb,
  ADD COLUMN IF NOT EXISTS bpmh_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS fontes_json jsonb;

-- 4) Prescrição do serviço e gabarito de cada caso: tabela PRIVADA.
-- Só o dono da sala e o admin leem e escrevem. NÃO há política para anon: a prescrição chega ao aluno por função no servidor,
-- e só depois do envio da BPMH. O gabarito nunca sai do servidor.
CREATE TABLE IF NOT EXISTS public.reconciliation_v2_privado (
  case_id uuid PRIMARY KEY REFERENCES public.reconciliation_clinical_cases(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.reconciliation_rooms(id) ON DELETE CASCADE,
  prescricao jsonb NOT NULL DEFAULT '[]'::jsonb,
  gabarito jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_v2_privado_room ON public.reconciliation_v2_privado(room_id);

ALTER TABLE public.reconciliation_v2_privado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reconciliation_v2_privado" ON public.reconciliation_v2_privado FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can manage reconciliation_v2_privado" ON public.reconciliation_v2_privado FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM public.reconciliation_rooms r WHERE r.id = reconciliation_v2_privado.room_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reconciliation_rooms r WHERE r.id = reconciliation_v2_privado.room_id AND r.user_id = auth.uid()));