-- SOAP v2: avaliação detalhada (rubrica, auditoria de fatos, iceberg, calibração) em tabela PRIVADA.
-- Só o dono da sala e o admin leem e escrevem. NÃO há política para anon: o aluno recebe a devolutiva por função no
-- servidor, e só depois que o professor libera. A função de correção (service role) grava aqui.
CREATE TABLE IF NOT EXISTS public.soap_v2_avaliacoes (
  response_id uuid PRIMARY KEY REFERENCES public.soap_responses(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.soap_rooms(id) ON DELETE CASCADE,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  confirmada boolean NOT NULL DEFAULT false,
  liberada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_soap_v2_avaliacoes_room ON public.soap_v2_avaliacoes(room_id);

ALTER TABLE public.soap_v2_avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all soap_v2_avaliacoes" ON public.soap_v2_avaliacoes FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can manage soap_v2_avaliacoes" ON public.soap_v2_avaliacoes FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM public.soap_rooms r WHERE r.id = soap_v2_avaliacoes.room_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.soap_rooms r WHERE r.id = soap_v2_avaliacoes.room_id AND r.user_id = auth.uid()));
