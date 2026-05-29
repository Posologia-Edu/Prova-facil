
-- ANNOUNCEMENTS
CREATE TABLE public.class_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES public.class_semesters(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_class_announcements_class ON public.class_announcements(class_id);
CREATE INDEX idx_class_announcements_semester ON public.class_announcements(semester_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_announcements TO authenticated;
GRANT ALL ON public.class_announcements TO service_role;

ALTER TABLE public.class_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Class owner can read announcements"
ON public.class_announcements FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_announcements.class_id AND c.user_id = auth.uid()));
CREATE POLICY "Class owner can insert announcements"
ON public.class_announcements FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_announcements.class_id AND c.user_id = auth.uid()));
CREATE POLICY "Class owner can update announcements"
ON public.class_announcements FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_announcements.class_id AND c.user_id = auth.uid()));
CREATE POLICY "Class owner can delete announcements"
ON public.class_announcements FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_announcements.class_id AND c.user_id = auth.uid()));

CREATE TRIGGER trg_class_announcements_updated
BEFORE UPDATE ON public.class_announcements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RUBRIC LIBRARY
CREATE TABLE public.class_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL DEFAULT 'seminar',
  rubric_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_class_rubrics_user ON public.class_rubrics(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_rubrics TO authenticated;
GRANT ALL ON public.class_rubrics TO service_role;

ALTER TABLE public.class_rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read rubrics"
ON public.class_rubrics FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "Owner can insert rubrics"
ON public.class_rubrics FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner can update rubrics"
ON public.class_rubrics FOR UPDATE TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "Owner can delete rubrics"
ON public.class_rubrics FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER trg_class_rubrics_updated
BEFORE UPDATE ON public.class_rubrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link lessons to a library rubric (optional)
ALTER TABLE public.class_schedule_items
ADD COLUMN IF NOT EXISTS rubric_id UUID REFERENCES public.class_rubrics(id) ON DELETE SET NULL;
