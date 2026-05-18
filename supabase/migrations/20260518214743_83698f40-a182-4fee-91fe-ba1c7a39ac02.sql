CREATE TABLE public.mock_trial_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mock_trial_id UUID NOT NULL,
  student_id UUID NOT NULL,
  case_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','excused')),
  score_override NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (student_id, case_id)
);

CREATE INDEX idx_mock_trial_attendance_trial ON public.mock_trial_attendance(mock_trial_id);

ALTER TABLE public.mock_trial_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage attendance of own trials"
ON public.mock_trial_attendance
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.mock_trials mt
    WHERE mt.id = mock_trial_attendance.mock_trial_id
      AND mt.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mock_trials mt
    WHERE mt.id = mock_trial_attendance.mock_trial_id
      AND mt.user_id = auth.uid()
  )
);

CREATE TRIGGER update_mock_trial_attendance_updated_at
BEFORE UPDATE ON public.mock_trial_attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();