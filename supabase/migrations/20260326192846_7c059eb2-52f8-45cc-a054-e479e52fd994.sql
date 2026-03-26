
-- =============================================
-- PHASE 1: Gamification tables
-- =============================================

CREATE TABLE public.achievement_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'trophy',
  category text NOT NULL DEFAULT 'general',
  criteria_json jsonb NOT NULL DEFAULT '{}',
  points_reward int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.student_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email text NOT NULL,
  points int NOT NULL DEFAULT 0,
  source text NOT NULL,
  source_id text,
  metadata_json jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.student_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email text NOT NULL,
  achievement_id uuid REFERENCES public.achievement_definitions(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_email, achievement_id)
);

CREATE INDEX idx_student_points_email ON public.student_points(student_email);
CREATE INDEX idx_student_achievements_email ON public.student_achievements(student_email);

-- =============================================
-- PHASE 2: Competency tables
-- =============================================

CREATE TABLE public.competency_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  area text NOT NULL,
  description text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.question_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES public.question_bank(id) ON DELETE CASCADE NOT NULL,
  competency_id uuid REFERENCES public.competency_definitions(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(question_id, competency_id)
);

-- =============================================
-- PHASE 3: AI Feedback table
-- =============================================

CREATE TABLE public.student_ai_feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email text NOT NULL,
  feedback_type text NOT NULL DEFAULT 'general',
  source_type text,
  source_ids text[],
  content_json jsonb NOT NULL DEFAULT '{}',
  generated_by text DEFAULT 'ai',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_ai_feedbacks_email ON public.student_ai_feedbacks(student_email);

-- =============================================
-- PHASE 5: Portfolio tables
-- =============================================

CREATE TABLE public.student_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email text UNIQUE NOT NULL,
  student_name text,
  config_json jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.portfolio_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid REFERENCES public.student_portfolios(id) ON DELETE CASCADE NOT NULL,
  entry_type text NOT NULL,
  title text NOT NULL,
  score numeric,
  max_score numeric,
  metadata_json jsonb DEFAULT '{}',
  entry_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_entries_portfolio ON public.portfolio_entries(portfolio_id);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competency_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_ai_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_entries ENABLE ROW LEVEL SECURITY;

-- Achievement definitions: public read
CREATE POLICY "Anyone can read achievement definitions" ON public.achievement_definitions FOR SELECT USING (true);
CREATE POLICY "Admins can manage achievement definitions" ON public.achievement_definitions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Student points: public read (for rankings), insert by authenticated
CREATE POLICY "Anyone can read student points" ON public.student_points FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert points" ON public.student_points FOR INSERT TO authenticated WITH CHECK (true);

-- Student achievements: public read
CREATE POLICY "Anyone can read achievements" ON public.student_achievements FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert achievements" ON public.student_achievements FOR INSERT TO authenticated WITH CHECK (true);

-- Competency definitions: owner can manage
CREATE POLICY "Users can manage own competencies" ON public.competency_definitions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anyone can read competencies" ON public.competency_definitions FOR SELECT USING (true);

-- Question competencies: authenticated can manage
CREATE POLICY "Authenticated can manage question competencies" ON public.question_competencies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AI feedbacks: public read (students access by email)
CREATE POLICY "Anyone can read AI feedbacks" ON public.student_ai_feedbacks FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert AI feedbacks" ON public.student_ai_feedbacks FOR INSERT TO authenticated WITH CHECK (true);

-- Portfolios: public read
CREATE POLICY "Anyone can read portfolios" ON public.student_portfolios FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage portfolios" ON public.student_portfolios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Portfolio entries: public read
CREATE POLICY "Anyone can read portfolio entries" ON public.portfolio_entries FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage portfolio entries" ON public.portfolio_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for rankings
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_points;
