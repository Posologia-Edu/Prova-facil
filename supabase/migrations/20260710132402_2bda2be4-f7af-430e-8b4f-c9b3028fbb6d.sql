
DO $$
DECLARE
  frm RECORD;
  new_answers JSONB;
  k TEXT;
  v JSONB;
  src_title TEXT;
  new_id UUID;
BEGIN
  FOR frm IN
    SELECT f.id, f.room_id, f.content_json
    FROM public.reconciliation_forms f
    WHERE f.form_type = 'answer_key'
      AND f.content_json ? 'case_answers'
      AND NOT EXISTS (
        SELECT 1 FROM public.reconciliation_clinical_cases cc
        WHERE cc.room_id = f.room_id
          AND cc.id::text IN (SELECT jsonb_object_keys(f.content_json->'case_answers'))
      )
  LOOP
    new_answers := '{}'::jsonb;
    FOR k, v IN SELECT * FROM jsonb_each(frm.content_json->'case_answers')
    LOOP
      -- Look up source title from ANY reconciliation_clinical_cases with this id
      SELECT title INTO src_title FROM public.reconciliation_clinical_cases WHERE id::text = k LIMIT 1;
      new_id := NULL;
      IF src_title IS NOT NULL THEN
        SELECT id INTO new_id FROM public.reconciliation_clinical_cases
        WHERE room_id = frm.room_id AND title = src_title LIMIT 1;
      END IF;
      IF new_id IS NOT NULL THEN
        new_answers := new_answers || jsonb_build_object(new_id::text, v);
      ELSE
        -- Keep original key so we don't lose data if we can't match
        new_answers := new_answers || jsonb_build_object(k, v);
      END IF;
    END LOOP;

    UPDATE public.reconciliation_forms
    SET content_json = jsonb_set(frm.content_json, '{case_answers}', new_answers, true)
    WHERE id = frm.id;
  END LOOP;
END $$;

-- Also fix documentation_forms with the same issue (safety pass for any missed rooms)
DO $$
DECLARE
  frm RECORD;
  new_answers JSONB;
  k TEXT;
  v JSONB;
  src_title TEXT;
  new_id UUID;
BEGIN
  FOR frm IN
    SELECT f.id, f.room_id, f.content_json
    FROM public.documentation_forms f
    WHERE f.content_json ? 'case_answers'
      AND NOT EXISTS (
        SELECT 1 FROM public.documentation_clinical_cases cc
        WHERE cc.room_id = f.room_id
          AND cc.id::text IN (SELECT jsonb_object_keys(f.content_json->'case_answers'))
      )
  LOOP
    new_answers := '{}'::jsonb;
    FOR k, v IN SELECT * FROM jsonb_each(frm.content_json->'case_answers')
    LOOP
      SELECT title INTO src_title FROM public.documentation_clinical_cases WHERE id::text = k LIMIT 1;
      new_id := NULL;
      IF src_title IS NOT NULL THEN
        SELECT id INTO new_id FROM public.documentation_clinical_cases
        WHERE room_id = frm.room_id AND title = src_title LIMIT 1;
      END IF;
      IF new_id IS NOT NULL THEN
        new_answers := new_answers || jsonb_build_object(new_id::text, v);
      ELSE
        new_answers := new_answers || jsonb_build_object(k, v);
      END IF;
    END LOOP;

    UPDATE public.documentation_forms
    SET content_json = jsonb_set(frm.content_json, '{case_answers}', new_answers, true)
    WHERE id = frm.id;
  END LOOP;
END $$;
