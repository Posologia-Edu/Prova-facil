
-- Add soft delete column to question_bank
ALTER TABLE public.question_bank ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Add soft delete column to exams
ALTER TABLE public.exams ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Add soft delete column to classes
ALTER TABLE public.classes ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create indexes for filtering non-deleted items
CREATE INDEX idx_question_bank_deleted_at ON public.question_bank (deleted_at);
CREATE INDEX idx_exams_deleted_at ON public.exams (deleted_at);
CREATE INDEX idx_classes_deleted_at ON public.classes (deleted_at);
