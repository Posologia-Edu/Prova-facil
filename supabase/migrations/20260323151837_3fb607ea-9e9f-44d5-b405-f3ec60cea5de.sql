CREATE OR REPLACE FUNCTION public.recalculate_observer_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resp RECORD;
  elem jsonb;
  total_score NUMERIC;
  answer_value TEXT;
  field_max_score NUMERIC;
  field_type TEXT;
  correct_idx INT;
  correct_option TEXT;
BEGIN
  FOR resp IN
    SELECT r.id, r.answers_json::jsonb as answers, f.content_json::jsonb as fields
    FROM simulation_responses r
    JOIN simulation_forms f ON f.id = r.form_id
    WHERE f.form_type = 'observer_eval'
      AND r.submitted_at IS NOT NULL
  LOOP
    total_score := 0;
    
    FOR elem IN SELECT jsonb_array_elements(resp.fields)
    LOOP
      field_max_score := (elem->>'max_score')::numeric;
      IF field_max_score IS NULL OR field_max_score = 0 THEN
        CONTINUE;
      END IF;
      
      answer_value := resp.answers->>( elem->>'id' );
      IF answer_value IS NULL THEN
        CONTINUE;
      END IF;
      
      field_type := elem->>'type';
      
      IF (field_type = 'radio' OR field_type = 'dropdown') 
         AND elem->>'correct_answer' IS NOT NULL 
         AND elem->'options' IS NOT NULL THEN
        correct_idx := (elem->>'correct_answer')::int;
        correct_option := (elem->'options'->>correct_idx);
        IF answer_value = correct_option THEN
          total_score := total_score + field_max_score;
        END IF;
      END IF;
    END LOOP;
    
    UPDATE simulation_responses SET score = total_score WHERE id = resp.id;
  END LOOP;
END;
$$;

SELECT public.recalculate_observer_scores();

DROP FUNCTION public.recalculate_observer_scores();