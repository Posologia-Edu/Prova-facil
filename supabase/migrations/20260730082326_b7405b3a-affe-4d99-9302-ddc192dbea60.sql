-- =========================================================
-- 1. Module tables (biomedicine / medicine / physiotherapy)
-- =========================================================
DO $$
DECLARE m text; t text; rooms text;
BEGIN
  FOREACH m IN ARRAY ARRAY['biomedicine','medicine','physiotherapy'] LOOP
    rooms := m || '_rooms';
    FOREACH t IN ARRAY ARRAY['clinical_cases','forms','participants','responses'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS all_select ON public.%I', m || '_' || t);
      EXECUTE format('DROP POLICY IF EXISTS all_insert ON public.%I', m || '_' || t);
      EXECUTE format('DROP POLICY IF EXISTS all_update ON public.%I', m || '_' || t);
      EXECUTE format('DROP POLICY IF EXISTS all_delete ON public.%I', m || '_' || t);

      -- Owner (teacher) full access
      EXECUTE format($f$
        CREATE POLICY owner_all ON public.%I
        FOR ALL TO authenticated
        USING (EXISTS (SELECT 1 FROM public.%I r WHERE r.id = %I.room_id AND r.user_id = auth.uid()))
        WITH CHECK (EXISTS (SELECT 1 FROM public.%I r WHERE r.id = %I.room_id AND r.user_id = auth.uid()))
      $f$, m || '_' || t, rooms, m || '_' || t, rooms, m || '_' || t);

      -- Anonymous participants: only while the room is active
      EXECUTE format($f$
        CREATE POLICY anon_active_select ON public.%I
        FOR SELECT TO anon
        USING (EXISTS (SELECT 1 FROM public.%I r WHERE r.id = %I.room_id AND r.status = 'active'))
      $f$, m || '_' || t, rooms, m || '_' || t);
    END LOOP;

    -- Participants + responses need anon write while the room is active
    FOREACH t IN ARRAY ARRAY['participants','responses'] LOOP
      EXECUTE format($f$
        CREATE POLICY anon_active_insert ON public.%I
        FOR INSERT TO anon
        WITH CHECK (EXISTS (SELECT 1 FROM public.%I r WHERE r.id = %I.room_id AND r.status = 'active'))
      $f$, m || '_' || t, rooms, m || '_' || t);
      EXECUTE format($f$
        CREATE POLICY anon_active_update ON public.%I
        FOR UPDATE TO anon
        USING (EXISTS (SELECT 1 FROM public.%I r WHERE r.id = %I.room_id AND r.status = 'active'))
        WITH CHECK (EXISTS (SELECT 1 FROM public.%I r WHERE r.id = %I.room_id AND r.status = 'active'))
      $f$, m || '_' || t, rooms, m || '_' || t, rooms, m || '_' || t);
    END LOOP;
  END LOOP;
END $$;

-- =========================================================
-- 2. Portfolios / gamification
-- =========================================================
DROP POLICY IF EXISTS "Anyone can read portfolio entries" ON public.portfolio_entries;
CREATE POLICY "Authenticated can read portfolio entries"
  ON public.portfolio_entries FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read portfolios" ON public.student_portfolios;
DROP POLICY IF EXISTS "Authenticated can manage portfolios" ON public.student_portfolios;
CREATE POLICY "Authenticated can read portfolios"
  ON public.student_portfolios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins manage portfolios"
  ON public.student_portfolios FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can read student points" ON public.student_points;
DROP POLICY IF EXISTS "Authenticated can insert points" ON public.student_points;
CREATE POLICY "Authenticated can read student points"
  ON public.student_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins insert points"
  ON public.student_points FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can read achievements" ON public.student_achievements;
DROP POLICY IF EXISTS "Authenticated can insert achievements" ON public.student_achievements;
CREATE POLICY "Authenticated can read achievements"
  ON public.student_achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins insert achievements"
  ON public.student_achievements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can read AI feedbacks" ON public.student_ai_feedbacks;
DROP POLICY IF EXISTS "Authenticated can insert AI feedbacks" ON public.student_ai_feedbacks;
CREATE POLICY "Authenticated can read AI feedbacks"
  ON public.student_ai_feedbacks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins insert AI feedbacks"
  ON public.student_ai_feedbacks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 3. Storage: stop anonymous listing of public buckets
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view osce materials" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view question images" ON storage.objects;
DROP POLICY IF EXISTS "Public read mock-trial-images" ON storage.objects;

CREATE POLICY "Authenticated can list osce materials"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'osce-materials');
CREATE POLICY "Authenticated can list question images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'question-images');
CREATE POLICY "Authenticated can list mock-trial-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'mock-trial-images');

-- =========================================================
-- 4. SECURITY DEFINER function execution privileges
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_student_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_role_on_signup(public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_role_on_signup(public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
