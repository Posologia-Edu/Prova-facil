-- Add feedback_released flag to virtual_patient_grades
ALTER TABLE public.virtual_patient_grades
ADD COLUMN IF NOT EXISTS feedback_released BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS feedback_released_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vp_grades_feedback_released
  ON public.virtual_patient_grades (feedback_released)
  WHERE feedback_released = true;