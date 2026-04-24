
-- Reassign students from duplicate groups to the earliest (kept) group per (mock_trial_id, group_number)
WITH ranked AS (
  SELECT id, mock_trial_id, group_number,
    ROW_NUMBER() OVER (PARTITION BY mock_trial_id, group_number ORDER BY created_at, id) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY mock_trial_id, group_number ORDER BY created_at, id) AS keep_id
  FROM public.mock_trial_groups
)
UPDATE public.mock_trial_students s
SET group_id = r.keep_id
FROM ranked r
WHERE s.group_id = r.id AND r.rn > 1;

-- Reassign assignments similarly
WITH ranked AS (
  SELECT id, mock_trial_id, group_number,
    ROW_NUMBER() OVER (PARTITION BY mock_trial_id, group_number ORDER BY created_at, id) AS rn,
    FIRST_VALUE(id) OVER (PARTITION BY mock_trial_id, group_number ORDER BY created_at, id) AS keep_id
  FROM public.mock_trial_groups
)
UPDATE public.mock_trial_assignments a
SET group_id = r.keep_id
FROM ranked r
WHERE a.group_id = r.id AND r.rn > 1;

-- Delete duplicate groups (keep the first per mock_trial_id + group_number)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY mock_trial_id, group_number ORDER BY created_at, id) AS rn
  FROM public.mock_trial_groups
)
DELETE FROM public.mock_trial_groups g USING ranked r
WHERE g.id = r.id AND r.rn > 1;

-- Prevent future duplicates
ALTER TABLE public.mock_trial_groups
  ADD CONSTRAINT mock_trial_groups_trial_number_unique UNIQUE (mock_trial_id, group_number);
