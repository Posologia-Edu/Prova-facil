
-- Make student_id nullable since non-auth students won't have a user account
ALTER TABLE public.exam_sessions ALTER COLUMN student_id DROP NOT NULL;
