-- Acesso por PIN, fase 3: fecha ao anônimo as tabelas que o aluno e o avaliador já não leem nem gravam direto.
-- ANTES de rodar: todas as funções abaixo precisam estar implantadas e os testes do aluno feitos (a ordem está no handoff):
--   Documentação, Reconciliação, SOAP e módulos de saúde (doc-aluno, recon-aluno, soap-aluno, area-aluno),
--   Júri (juri-aluno, juri-juiz), Paciente Virtual (vp-aluno), OSCE (osce-aluno, osce-avaliador),
--   SJT, Teste de Progresso, SCT, KFE (sjt-aluno, progress-aluno, sct-aluno, kfe-aluno), Observação Clínica (obs-clinica), form-draft.
-- Fica valendo o que já existe para o professor: dono, administrador e, onde não havia política de dono (virtual_patient_*), as políticas criadas no item 2.
-- Não mexe nas tabelas públicas de propósito (marketplace: exams, exam_questions e question_bank de provas compartilhadas).

-- 1) Remove, destas tabelas, toda política que vale para o anônimo ou que não tem condição real (aberta), qualquer que seja o nome.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        -- Anamnese já fechada na fase 1; aqui o resto
        'soap_rooms','soap_participants','soap_forms','soap_responses',
        'reconciliation_rooms','reconciliation_participants','reconciliation_forms','reconciliation_clinical_cases','reconciliation_responses',
        'documentation_rooms','documentation_participants','documentation_forms','documentation_clinical_cases','documentation_responses',
        'nursing_rooms','nursing_participants','nursing_forms','nursing_responses',
        'nutrition_rooms','nutrition_participants','nutrition_forms','nutrition_responses',
        'dentistry_rooms','dentistry_participants','dentistry_forms','dentistry_responses',
        'medicine_rooms','medicine_participants','medicine_forms','medicine_responses',
        'physiotherapy_rooms','physiotherapy_participants','physiotherapy_forms','physiotherapy_responses',
        'biomedicine_rooms','biomedicine_participants','biomedicine_forms','biomedicine_responses',
        'form_drafts',
        'mock_trials','mock_trial_groups','mock_trial_students','mock_trial_cases','mock_trial_assignments','mock_trial_sessions',
        'mock_trial_forms','mock_trial_responses','mock_trial_evaluations','mock_trial_evaluation_forms','mock_trial_case_images',
        'osce_exams','osce_stations','osce_circuits','osce_circuit_students','osce_station_evaluators','osce_station_materials',
        'osce_checklist_items','osce_evaluations','osce_evaluation_items','osce_chat_messages',
        'progress_tests','progress_test_questions','progress_test_sessions','progress_test_answers',
        'sct_exams','sct_scenarios','sct_expert_responses','sct_student_sessions','sct_student_answers',
        'kfe_exams','kfe_cases','kfe_key_features','kfe_sessions','kfe_answers',
        'sjt_exams','sjt_scenarios','sjt_sessions','sjt_answers',
        'clinical_observations','clinical_observation_sessions',
        'class_virtual_patients','class_vp_assignments','class_semesters',
        'virtual_patient_sessions','virtual_patient_messages','virtual_patient_grades','virtual_patient_mai_scores',
        'virtual_patient_encounter_roles','virtual_patient_record_sections',
        'question_bank'
      )
      AND (
        'anon' = ANY(roles)
        OR (coalesce(trim(qual), 'true') = 'true' AND coalesce(trim(with_check), 'true') = 'true')
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- 2) As tabelas virtual_patient_* não tinham política de dono: o professor lia tudo pela política aberta que acabou de sair.
--    Aqui entra o acesso do professor (dono da turma da sala) e de quem criou a sessão, só para quem está logado.
DROP POLICY IF EXISTS "VP sessions: dono da turma ou da sessao" ON public.virtual_patient_sessions;
CREATE POLICY "VP sessions: dono da turma ou da sessao" ON public.virtual_patient_sessions
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_virtual_patients cvp JOIN public.classes c ON c.id = cvp.class_id
      WHERE cvp.id = virtual_patient_sessions.class_virtual_patient_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_virtual_patients cvp JOIN public.classes c ON c.id = cvp.class_id
      WHERE cvp.id = virtual_patient_sessions.class_virtual_patient_id AND c.user_id = auth.uid()
    )
  );

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['virtual_patient_messages','virtual_patient_mai_scores','virtual_patient_encounter_roles','virtual_patient_record_sections']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'VP: via sessao visivel', t);
    -- o EXISTS passa pela política de virtual_patient_sessions: só enxerga a linha quem enxerga a sessão
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.virtual_patient_sessions s WHERE s.id = %I.session_id)) WITH CHECK (EXISTS (SELECT 1 FROM public.virtual_patient_sessions s WHERE s.id = %I.session_id))',
      'VP: via sessao visivel', t, t, t);
  END LOOP;
END $$;

-- 3) Gamificação e Portfólio: o aluno agora passa pela função gamificacao-aluno (credencial = sessão de prova + e-mail).
--    Estas tabelas estavam legíveis a QUALQUER pessoa, até sem login ("Anyone can read ..."), mas vazias, por isso a verificação
--    não as listava. Sai a leitura pública; ficam as políticas de professor e de quem está logado (o professor lê o portfólio
--    pela rota /portfolio/:email). O catálogo achievement_definitions continua público (só nomes e ícones de conquistas).
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('student_points','student_achievements','student_portfolios','portfolio_entries','student_ai_feedbacks')
      AND ('anon' = ANY(roles) OR 'public' = ANY(roles))
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- 4) Conferência (rode depois, fora desta migração):
--    node scripts/verificar-acesso-anonimo.mjs
--    Esperado: só as tabelas públicas de propósito (marketplace) podem aparecer.
