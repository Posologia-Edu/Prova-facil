-- Acesso por PIN, fase 1 (Anamnese): fecha ao anônimo as tabelas simulation_*.
-- Antes disto, o aluno já passa pela função sim-aluno e o professor entra logado como dono da sala.
-- Fica valendo só o que já existe: administrador e dono da sala (políticas "Admins can manage all ..." e "Owner can manage ...").

-- 1) Remove toda política aberta (sem condição real) dessas tabelas, qualquer que seja o nome.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('simulation_rooms','simulation_participants','simulation_forms','simulation_rounds',
                        'simulation_round_assignments','simulation_responses','simulation_sessions')
      AND coalesce(trim(qual), 'true') = 'true'
      AND coalesce(trim(with_check), 'true') = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- 2) A troca de participante deixa de aceitar o PIN como prova: só o dono da sala (ou admin), logado.
CREATE OR REPLACE FUNCTION public.swap_simulation_assignment(_assignment_id uuid, _new_participant_id uuid, _access_code text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_round_id uuid;
  v_room_id uuid;
  v_old_participant uuid;
  v_room_owner uuid;
  v_conflict_id uuid;
  v_case int;
BEGIN
  SELECT a.round_id, a.participant_id, r.room_id, rm.user_id
    INTO v_round_id, v_old_participant, v_room_id, v_room_owner
  FROM public.simulation_round_assignments a
  JOIN public.simulation_rounds r ON r.id = a.round_id
  JOIN public.simulation_rooms rm ON rm.id = r.room_id
  WHERE a.id = _assignment_id;

  IF v_round_id IS NULL THEN
    RAISE EXCEPTION 'Atribuição não encontrada';
  END IF;

  IF NOT (
    (auth.uid() IS NOT NULL AND auth.uid() = v_room_owner)
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
  ) THEN
    RAISE EXCEPTION 'Sem permissão para substituir participantes desta sala';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.simulation_participants p
    WHERE p.id = _new_participant_id AND p.room_id = v_room_id
  ) THEN
    RAISE EXCEPTION 'Participante não pertence a esta sala';
  END IF;

  SELECT a.id INTO v_conflict_id
  FROM public.simulation_round_assignments a
  WHERE a.round_id = v_round_id
    AND a.participant_id = _new_participant_id
    AND a.id <> _assignment_id
  LIMIT 1;

  UPDATE public.simulation_round_assignments
     SET participant_id = _new_participant_id
   WHERE id = _assignment_id;

  IF v_conflict_id IS NOT NULL THEN
    UPDATE public.simulation_round_assignments
       SET participant_id = v_old_participant
     WHERE id = v_conflict_id;
  END IF;

  -- The clinical case must follow the student: for "patient" assignments,
  -- restore the case each participant originally received in this room.
  FOR v_conflict_id, v_case IN
    SELECT a.id,
           (SELECT prev.case_index
              FROM public.simulation_round_assignments prev
              JOIN public.simulation_rounds pr ON pr.id = prev.round_id
             WHERE pr.room_id = v_room_id
               AND prev.assigned_role = 'patient'
               AND prev.participant_id = a.participant_id
               AND prev.case_index IS NOT NULL
               AND prev.round_id <> v_round_id
             ORDER BY pr.cycle, pr.round_number
             LIMIT 1)
      FROM public.simulation_round_assignments a
     WHERE a.round_id = v_round_id
       AND a.assigned_role = 'patient'
       AND a.id IN (_assignment_id, COALESCE(v_conflict_id, _assignment_id))
  LOOP
    IF v_case IS NOT NULL THEN
      UPDATE public.simulation_round_assignments
         SET case_index = v_case
       WHERE id = v_conflict_id;
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.swap_simulation_assignment(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.swap_simulation_assignment(uuid, uuid, text) TO authenticated, service_role;
