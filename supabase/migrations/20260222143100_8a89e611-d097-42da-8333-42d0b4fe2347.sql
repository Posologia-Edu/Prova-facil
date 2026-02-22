
-- Table for exams shared to marketplace
CREATE TABLE public.marketplace_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  tags TEXT[] DEFAULT '{}',
  question_count INTEGER NOT NULL DEFAULT 0,
  avg_rating NUMERIC DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_exams_exam_unique UNIQUE (exam_id)
);

-- Ratings table
CREATE TABLE public.marketplace_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace_exam_id UUID NOT NULL REFERENCES public.marketplace_exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_ratings_unique UNIQUE (marketplace_exam_id, user_id)
);

-- Comments table
CREATE TABLE public.marketplace_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace_exam_id UUID NOT NULL REFERENCES public.marketplace_exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_comments ENABLE ROW LEVEL SECURITY;

-- Marketplace exams: anyone authenticated can view active, owners can manage
CREATE POLICY "Anyone can view active marketplace exams"
ON public.marketplace_exams FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can manage own marketplace exams"
ON public.marketplace_exams FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all marketplace exams"
ON public.marketplace_exams FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ratings: anyone authenticated can view, users manage own
CREATE POLICY "Anyone can view ratings"
ON public.marketplace_ratings FOR SELECT
USING (true);

CREATE POLICY "Users can manage own ratings"
ON public.marketplace_ratings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Comments: anyone can view, users manage own
CREATE POLICY "Anyone can view comments"
ON public.marketplace_comments FOR SELECT
USING (true);

CREATE POLICY "Users can manage own comments"
ON public.marketplace_comments FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_marketplace_exams_updated_at
BEFORE UPDATE ON public.marketplace_exams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketplace_comments_updated_at
BEFORE UPDATE ON public.marketplace_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
