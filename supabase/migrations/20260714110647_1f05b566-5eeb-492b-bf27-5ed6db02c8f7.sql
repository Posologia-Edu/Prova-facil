
-- 1) Extend virtual_patient_sessions with technical performance metrics
ALTER TABLE public.virtual_patient_sessions
  ADD COLUMN IF NOT EXISTS total_tokens integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_latency_ms bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_interactions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS operational_failures integer NOT NULL DEFAULT 0;

-- 2) Create research metrics table
CREATE TABLE IF NOT EXISTS public.vp_research_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.virtual_patient_sessions(id) ON DELETE CASCADE,
  class_virtual_patient_id uuid,
  group_id uuid,
  student_email text,
  student_name text,
  patient_id text,
  clinical_context text,
  evaluator_id uuid NOT NULL,

  -- IDCG (Índice de Desempenho Clínico Global)
  idcg_empathy numeric,          -- 1..5
  idcg_active_listening numeric, -- 1..5
  idcg_reasoning numeric,        -- 1..5
  idcg_conduct numeric,          -- 1..5
  idcg_safety numeric,           -- 1..5
  idcg_score numeric,            -- média

  -- ISC (Índice de Segurança Clínica)
  unsafe_conducts jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{description, severity: 1|2|3}]
  isc_total numeric,
  isc_count integer,
  isc_score numeric,
  isc_risk_class text, -- 'Leve-Moderado' | 'Moderado-Alto' | 'Alto'

  -- Realismo do agente (Likert 1-5)
  realism_score numeric,
  empathy_verbal_score numeric,
  clinical_adequacy_score numeric,
  naturalness_score numeric,

  -- Coerência semântica (calculada por edge function)
  qr_pairs integer,
  comparable_pairs integer,
  semantic_similarity_mean numeric,
  semantic_similarity_std numeric,
  same_stage_similarity numeric,
  between_stages_similarity numeric,

  -- Precisão RAG
  rag_accuracy numeric, -- 0..1

  -- Estabilidade comportamental
  behavioral_stability_pct numeric, -- 0..100

  -- Notas qualitativas
  qualitative_notes text,

  evaluated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, evaluator_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vp_research_metrics TO authenticated;
GRANT ALL ON public.vp_research_metrics TO service_role;

ALTER TABLE public.vp_research_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Evaluators manage their research entries"
  ON public.vp_research_metrics
  FOR ALL
  TO authenticated
  USING (auth.uid() = evaluator_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = evaluator_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER vp_research_metrics_updated_at
  BEFORE UPDATE ON public.vp_research_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_vp_research_session ON public.vp_research_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_vp_research_class_vp ON public.vp_research_metrics(class_virtual_patient_id);
CREATE INDEX IF NOT EXISTS idx_vp_research_evaluator ON public.vp_research_metrics(evaluator_id);
