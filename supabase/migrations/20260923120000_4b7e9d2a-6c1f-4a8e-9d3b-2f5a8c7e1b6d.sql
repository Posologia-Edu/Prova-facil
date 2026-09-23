
-- Peer evaluation for Júri Simulado (mock trial) — extends the same pattern
-- built for Paciente Virtual (see src/lib/vp-peer-eval.ts) to a module where
-- grading is per (case, group) and a group's role changes across cases
-- (a group can be Acusação in case 1 and Júri Técnico in case 2).
--
-- Trigger: the judge finishing a case (mock_trial_sessions.status -> 'finished'
-- in MockTrialJudge.tsx's finishSession()). At that point BOTH the prep work
-- and the live performance for that specific case have already happened, so
-- one round per case can ask about both without recency bias, as long as
-- "preparação" gets its own dedicated criterion — see src/lib/mt-peer-eval.ts.
--
-- Because a group keeps the same membership across cases but changes role,
-- the same student can receive one invite per case they participated in —
-- each one clearly labeled with case + role in the e-mail/form.

CREATE TABLE public.mock_trial_peer_eval_tokens (
  token text PRIMARY KEY DEFAULT encode(gen_random_bytes(24), 'hex'),
  case_id uuid NOT NULL REFERENCES public.mock_trial_cases(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.mock_trial_groups(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('prosecution', 'defense', 'jury')),
  evaluator_email text NOT NULL,
  evaluator_name text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mt_peer_tokens_case_group ON public.mock_trial_peer_eval_tokens(case_id, group_id);

ALTER TABLE public.mock_trial_peer_eval_tokens ENABLE ROW LEVEL SECURITY;
-- No policies at all: tokens are a bearer credential resolved only by edge
-- functions via the service role (bypasses RLS) — never exposed to the client SDK.

CREATE TABLE public.mock_trial_peer_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.mock_trial_cases(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.mock_trial_groups(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('prosecution', 'defense', 'jury')),
  evaluator_email text NOT NULL,
  evaluator_name text,
  evaluatee_email text NOT NULL,
  evaluatee_name text,
  preparacao_score smallint NOT NULL CHECK (preparacao_score BETWEEN 0 AND 5),
  atuacao_score smallint NOT NULL CHECK (atuacao_score BETWEEN 0 AND 5),
  colaboracao_score smallint NOT NULL CHECK (colaboracao_score BETWEEN 0 AND 5),
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, group_id, evaluator_email, evaluatee_email)
);

CREATE INDEX idx_mt_peer_evals_case_group ON public.mock_trial_peer_evaluations(case_id, group_id);
CREATE INDEX idx_mt_peer_evals_evaluatee ON public.mock_trial_peer_evaluations(case_id, group_id, evaluatee_email);

ALTER TABLE public.mock_trial_peer_evaluations ENABLE ROW LEVEL SECURITY;

-- Teachers can read (read-only) the peer evaluations of their own mock trials —
-- same ownership pattern as mock_trial_case_images (through mock_trial_cases -> mock_trials).
-- Writes only ever happen via the submit-mt-peer-evaluation edge function (service role).
CREATE POLICY "Owner can view mock_trial_peer_evaluations"
  ON public.mock_trial_peer_evaluations FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mock_trial_cases c
    JOIN public.mock_trials t ON c.mock_trial_id = t.id
    WHERE c.id = mock_trial_peer_evaluations.case_id AND t.user_id = auth.uid()
  ));
