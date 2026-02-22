
-- Add student identity to exam_sessions for non-auth student access
ALTER TABLE public.exam_sessions
  ADD COLUMN student_email text,
  ADD COLUMN student_name text;

-- Create index for looking up sessions by email
CREATE INDEX idx_exam_sessions_student_email ON public.exam_sessions(student_email);
