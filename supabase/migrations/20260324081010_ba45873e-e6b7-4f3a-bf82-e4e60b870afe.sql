
CREATE TABLE public.form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  area text NOT NULL,
  module_type text NOT NULL,
  form_type text NOT NULL DEFAULT 'standard',
  title text NOT NULL,
  description text,
  content_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_native boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view native templates"
  ON public.form_templates FOR SELECT TO authenticated
  USING (is_native = true);

CREATE POLICY "Owners can view their own templates"
  ON public.form_templates FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert their own templates"
  ON public.form_templates FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their own templates"
  ON public.form_templates FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their own templates"
  ON public.form_templates FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON public.form_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
