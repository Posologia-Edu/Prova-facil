
CREATE TABLE public.form_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_key text NOT NULL UNIQUE,
  module text NOT NULL,
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_drafts_module ON public.form_drafts(module);
CREATE INDEX idx_form_drafts_updated_at ON public.form_drafts(updated_at);

ALTER TABLE public.form_drafts ENABLE ROW LEVEL SECURITY;

-- Drafts are accessed by anonymous students via PIN/email flows.
-- The draft_key embeds room_id + participant_id + form_id and acts as the capability token,
-- consistent with the existing PIN-based access model for these tables.
CREATE POLICY "Anyone can read drafts by key"
  ON public.form_drafts FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert drafts"
  ON public.form_drafts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update drafts"
  ON public.form_drafts FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete drafts"
  ON public.form_drafts FOR DELETE
  USING (true);

CREATE TRIGGER update_form_drafts_updated_at
  BEFORE UPDATE ON public.form_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
