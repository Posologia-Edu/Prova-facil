ALTER TABLE public.soap_responses ADD COLUMN ai_score numeric DEFAULT NULL;
ALTER TABLE public.soap_responses ADD COLUMN ai_feedback_json jsonb DEFAULT NULL;