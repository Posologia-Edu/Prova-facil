-- Documentação v2, etapa 1 (base). Nada muda para as salas existentes (v1 por padrão).
-- 1) Marca de versão e configuração da sala.
ALTER TABLE public.documentation_rooms ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;
-- De qual conciliação a dupla parte: 'validada' (a do caso, revisada pelo professor) ou 'propria' (a que a dupla fez na Reconciliação).
ALTER TABLE public.documentation_rooms ADD COLUMN IF NOT EXISTS base_conciliacao text NOT NULL DEFAULT 'validada';
ALTER TABLE public.documentation_rooms ADD COLUMN IF NOT EXISTS tempo_sugerido_min integer;

-- 2) O dossiê que o aluno lê (derivado do caso da Reconciliação v2; nunca traz prescrição nem gabarito).
ALTER TABLE public.documentation_clinical_cases ADD COLUMN IF NOT EXISTS caso_json jsonb;

-- 3) Respostas v2: uma por dupla, com os quatro documentos. Tabela PRIVADA (sem política para anon):
-- o aluno só chega a ela pela função doc-v2-aluno.
CREATE TABLE IF NOT EXISTS public.documentation_v2_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.documentation_rooms(id) ON DELETE CASCADE,
  pair_index integer NOT NULL,
  clinical_case_id uuid REFERENCES public.documentation_clinical_cases(id) ON DELETE SET NULL,
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, pair_index)
);

-- 4) Conciliação de referência e gabarito de cada caso: tabela PRIVADA, só o servidor entrega.
CREATE TABLE IF NOT EXISTS public.documentation_v2_privado (
  case_id uuid PRIMARY KEY REFERENCES public.documentation_clinical_cases(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.documentation_rooms(id) ON DELETE CASCADE,
  referencia jsonb NOT NULL DEFAULT '[]'::jsonb,
  gabarito jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentation_v2_respostas_room ON public.documentation_v2_respostas(room_id);
CREATE INDEX IF NOT EXISTS idx_documentation_v2_privado_room ON public.documentation_v2_privado(room_id);

ALTER TABLE public.documentation_v2_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentation_v2_privado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all documentation_v2_respostas" ON public.documentation_v2_respostas FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can manage documentation_v2_respostas" ON public.documentation_v2_respostas FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM public.documentation_rooms r WHERE r.id = documentation_v2_respostas.room_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.documentation_rooms r WHERE r.id = documentation_v2_respostas.room_id AND r.user_id = auth.uid()));

CREATE POLICY "Admins can manage all documentation_v2_privado" ON public.documentation_v2_privado FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owner can manage documentation_v2_privado" ON public.documentation_v2_privado FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM public.documentation_rooms r WHERE r.id = documentation_v2_privado.room_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.documentation_rooms r WHERE r.id = documentation_v2_privado.room_id AND r.user_id = auth.uid()));
