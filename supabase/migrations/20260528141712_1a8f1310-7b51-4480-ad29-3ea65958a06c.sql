DO $$
DECLARE
  form_rec RECORD;
  old_key TEXT;
  old_fields JSONB;
  old_title TEXT;
  new_case_id UUID;
  new_answers JSONB;
BEGIN
  FOR form_rec IN
    SELECT id, room_id, content_json
    FROM documentation_forms
    WHERE form_type IN ('referral_answer_key','medication_answer_key')
      AND content_json ? 'case_answers'
  LOOP
    new_answers := '{}'::jsonb;
    FOR old_key, old_fields IN
      SELECT key, value FROM jsonb_each(form_rec.content_json->'case_answers')
    LOOP
      IF EXISTS (SELECT 1 FROM documentation_clinical_cases c WHERE c.room_id = form_rec.room_id AND c.id::text = old_key) THEN
        new_answers := new_answers || jsonb_build_object(old_key, old_fields);
      ELSE
        SELECT title INTO old_title FROM documentation_clinical_cases WHERE id::text = old_key LIMIT 1;
        IF old_title IS NOT NULL THEN
          SELECT id INTO new_case_id
          FROM documentation_clinical_cases
          WHERE room_id = form_rec.room_id AND title = old_title
          LIMIT 1;
          IF new_case_id IS NOT NULL THEN
            new_answers := new_answers || jsonb_build_object(new_case_id::text, old_fields);
          END IF;
        END IF;
      END IF;
    END LOOP;
    UPDATE documentation_forms SET content_json = jsonb_build_object('case_answers', new_answers) WHERE id = form_rec.id;
  END LOOP;
END $$;

UPDATE documentation_responses
SET ai_score = NULL, ai_feedback_json = NULL
WHERE room_id IN (
  'd29e4378-c4e5-4493-b1fe-02d7841fbd14',
  'e151862f-ce3f-4414-8471-c6bdd60403e8'
);