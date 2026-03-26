
-- Table to track template shares between teachers
CREATE TABLE public.form_template_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  shared_with UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, shared_with)
);

ALTER TABLE public.form_template_shares ENABLE ROW LEVEL SECURITY;

-- Owner can see shares they created
CREATE POLICY "Users can see shares they created"
  ON public.form_template_shares FOR SELECT
  TO authenticated
  USING (shared_by = auth.uid());

-- Recipients can see shares sent to them
CREATE POLICY "Users can see shares received"
  ON public.form_template_shares FOR SELECT
  TO authenticated
  USING (shared_with = auth.uid());

-- Template owner can share
CREATE POLICY "Template owners can share"
  ON public.form_template_shares FOR INSERT
  TO authenticated
  WITH CHECK (shared_by = auth.uid());

-- Template owner can revoke shares
CREATE POLICY "Template owners can delete shares"
  ON public.form_template_shares FOR DELETE
  TO authenticated
  USING (shared_by = auth.uid());
