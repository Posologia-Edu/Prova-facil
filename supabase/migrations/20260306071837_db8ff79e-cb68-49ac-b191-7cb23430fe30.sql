
CREATE TABLE public.ai_usage_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL,
  model text,
  prompt_type text,
  tokens_input integer DEFAULT 0,
  tokens_output integer DEFAULT 0,
  estimated_cost_usd numeric DEFAULT 0,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert ai_usage_log"
ON public.ai_usage_log
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Admins can view all ai_usage_log"
ON public.ai_usage_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
