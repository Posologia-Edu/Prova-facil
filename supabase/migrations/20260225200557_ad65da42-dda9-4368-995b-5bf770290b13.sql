
-- Table to store external AI provider API keys (admin-managed)
CREATE TABLE public.ai_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage API keys
CREATE POLICY "Admins can manage all ai_api_keys"
ON public.ai_api_keys
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_ai_api_keys_updated_at
BEFORE UPDATE ON public.ai_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the providers
INSERT INTO public.ai_api_keys (provider) VALUES
  ('groq'),
  ('openai'),
  ('anthropic'),
  ('openrouter'),
  ('google');
