
-- Deduplicate SOAP submissions (target_participant_id IS NULL)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY room_id, participant_id
      ORDER BY (admin_score IS NOT NULL) DESC,
               (admin_feedback IS NOT NULL) DESC,
               COALESCE(submitted_at, created_at) DESC
    ) AS rn
  FROM public.soap_responses
  WHERE target_participant_id IS NULL
)
DELETE FROM public.soap_responses
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Deduplicate peer evaluations (target_participant_id IS NOT NULL)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY room_id, participant_id, target_participant_id
      ORDER BY COALESCE(submitted_at, created_at) DESC
    ) AS rn
  FROM public.soap_responses
  WHERE target_participant_id IS NOT NULL
)
DELETE FROM public.soap_responses
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS soap_responses_unique_soap
  ON public.soap_responses (room_id, participant_id)
  WHERE target_participant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS soap_responses_unique_peer
  ON public.soap_responses (room_id, participant_id, target_participant_id)
  WHERE target_participant_id IS NOT NULL;
