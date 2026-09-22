
-- Peer evaluation for Virtual Patient GROUP activities.
--
-- Each group member gets a one-time e-mail link (sent right after the group
-- submits the MAI, which is when a case is considered finished) and rates
-- their teammates on 3 behavioral criteria. The result is layered as an
-- individual +/-1.0 bonus on top of the shared, AI-graded case score — see
-- src/lib/vp-peer-eval.ts for the scoring formula. This lets two students in
-- the same group, who did the same anamnese, end up with different final
-- grades based on how the group rated their participation.

CREATE TABLE public.virtual_patient_peer_eval_tokens (
  token text PRIMARY KEY DEFAULT encode(gen_random_bytes(24), 'hex'),
  group_id uuid NOT NULL,
  class_virtual_patient_id uuid NOT NULL REFERENCES public.class_virtual_patients(id) ON DELETE CASCADE,
  evaluator_email text NOT NULL,
  evaluator_name text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vp_peer_tokens_group ON public.virtual_patient_peer_eval_tokens(group_id);

ALTER TABLE public.virtual_patient_peer_eval_tokens ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policy on purpose: the token is a bearer credential,
-- so it must only ever be resolved server-side (edge functions using the
-- service role, which bypasses RLS) — never listable via the client SDK.
CREATE POLICY "Admins can manage all vp_peer_eval_tokens"
  ON public.virtual_patient_peer_eval_tokens FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.virtual_patient_peer_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  class_virtual_patient_id uuid NOT NULL REFERENCES public.class_virtual_patients(id) ON DELETE CASCADE,
  evaluator_email text NOT NULL,
  evaluator_name text,
  evaluatee_email text NOT NULL,
  evaluatee_name text,
  participacao_score smallint NOT NULL CHECK (participacao_score BETWEEN 0 AND 5),
  contribuicao_score smallint NOT NULL CHECK (contribuicao_score BETWEEN 0 AND 5),
  colaboracao_score smallint NOT NULL CHECK (colaboracao_score BETWEEN 0 AND 5),
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, evaluator_email, evaluatee_email)
);

CREATE INDEX idx_vp_peer_evals_group ON public.virtual_patient_peer_evaluations(group_id);
CREATE INDEX idx_vp_peer_evals_evaluatee ON public.virtual_patient_peer_evaluations(group_id, evaluatee_email);

ALTER TABLE public.virtual_patient_peer_evaluations ENABLE ROW LEVEL SECURITY;

-- Teachers can read (read-only) the peer evaluations of their own classes —
-- lets them spot suspicious patterns (everyone giving 5s, one student ganged
-- up on) before trusting the bonus. Writes only ever happen via the
-- submit-vp-peer-evaluation edge function (service role).
CREATE POLICY "Owner can view virtual_patient_peer_evaluations"
  ON public.virtual_patient_peer_evaluations FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.class_virtual_patients cvp
    JOIN public.classes c ON c.id = cvp.class_id
    WHERE cvp.id = virtual_patient_peer_evaluations.class_virtual_patient_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all vp_peer_evaluations"
  ON public.virtual_patient_peer_evaluations FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
