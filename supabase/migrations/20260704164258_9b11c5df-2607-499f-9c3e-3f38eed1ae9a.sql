
CREATE TABLE public.class_visit_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location TEXT,
  preceptor_name TEXT,
  preceptor_phone TEXT,
  notes TEXT,
  default_student_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_visit_templates TO authenticated;
GRANT ALL ON public.class_visit_templates TO service_role;

ALTER TABLE public.class_visit_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Class owner manages visit templates"
ON public.class_visit_templates
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_visit_templates.class_id AND c.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_visit_templates.class_id AND c.user_id = auth.uid()));

CREATE TRIGGER update_class_visit_templates_updated_at
BEFORE UPDATE ON public.class_visit_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_class_visit_templates_class_id ON public.class_visit_templates(class_id);

-- Optional link from concrete visit back to the template used
ALTER TABLE public.class_lesson_visits
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.class_visit_templates(id) ON DELETE SET NULL;
