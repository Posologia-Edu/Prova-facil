
-- Add proctoring_config to exams
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS proctoring_config jsonb DEFAULT '{}';

-- Add proctoring columns to exam_sessions
ALTER TABLE public.exam_sessions ADD COLUMN IF NOT EXISTS device_fingerprint jsonb;
ALTER TABLE public.exam_sessions ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.exam_sessions ADD COLUMN IF NOT EXISTS violation_count integer DEFAULT 0;
ALTER TABLE public.exam_sessions ADD COLUMN IF NOT EXISTS submission_hash text;

-- Create exam_audit_logs table
CREATE TABLE IF NOT EXISTS public.exam_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.exam_sessions(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for exam_audit_logs
ALTER TABLE public.exam_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow inserts from edge function (service role) - no user-facing policy needed
-- Allow authenticated users to read logs for their exams
CREATE POLICY "Teachers can view audit logs for their exams"
  ON public.exam_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exam_sessions es
      JOIN public.exam_publications ep ON es.publication_id = ep.id
      WHERE es.id = exam_audit_logs.session_id
      AND ep.user_id = auth.uid()
    )
  );

-- Allow anyone to insert (edge function uses service role)
CREATE POLICY "Service role can insert audit logs"
  ON public.exam_audit_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Enable realtime for audit logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_audit_logs;

-- Create private bucket for proctoring photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('exam-proctoring', 'exam-proctoring', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for exam-proctoring bucket
CREATE POLICY "Anyone can upload proctoring photos"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'exam-proctoring');

CREATE POLICY "Teachers can view proctoring photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'exam-proctoring');
