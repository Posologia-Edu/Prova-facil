-- Table for mock trial case images
CREATE TABLE public.mock_trial_case_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.mock_trial_cases(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  anchor TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  prompt TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  image_url TEXT,
  storage_path TEXT,
  error_message TEXT,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(case_id, slug)
);

CREATE INDEX idx_mock_trial_case_images_case ON public.mock_trial_case_images(case_id);

ALTER TABLE public.mock_trial_case_images ENABLE ROW LEVEL SECURITY;

-- Owner full access through mock_trial_cases -> mock_trials
CREATE POLICY "Owner access case images" ON public.mock_trial_case_images
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mock_trial_cases c
    JOIN public.mock_trials t ON c.mock_trial_id = t.id
    WHERE c.id = case_id AND t.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.mock_trial_cases c
    JOIN public.mock_trials t ON c.mock_trial_id = t.id
    WHERE c.id = case_id AND t.user_id = auth.uid()
  ));

-- Anonymous (judge / students) can view images
CREATE POLICY "Anon select case images" ON public.mock_trial_case_images
  FOR SELECT TO anon USING (true);

CREATE TRIGGER update_mock_trial_case_images_updated_at
  BEFORE UPDATE ON public.mock_trial_case_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime so editor reflects status changes live
ALTER PUBLICATION supabase_realtime ADD TABLE public.mock_trial_case_images;

-- Storage bucket for the actual image files
INSERT INTO storage.buckets (id, name, public)
VALUES ('mock-trial-images', 'mock-trial-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for the bucket
CREATE POLICY "Public read mock-trial-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'mock-trial-images');

-- Service role / authenticated owners can upload (edge function uses service role anyway)
CREATE POLICY "Authenticated insert mock-trial-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mock-trial-images');

CREATE POLICY "Authenticated update mock-trial-images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'mock-trial-images');

CREATE POLICY "Authenticated delete mock-trial-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mock-trial-images');
