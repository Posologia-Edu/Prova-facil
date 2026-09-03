CREATE OR REPLACE FUNCTION public.swap_simulation_assignment(
  _assignment_id uuid,
  _new_participant_id uuid,
  _access_code text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round_id uuid;
  v_room_id uuid;
  v_old_participant uuid;
  v_room_owner uuid;
  v_room_code text;
  v_conflict_id uuid;
BEGIN
  SELECT a.round_id, a.participant_id, r.room_id, rm.user_id, rm.access_code
    INTO v_round_id, v_old_participant, v_room_id, v_room_owner, v_room_code
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
    OR (_access_code IS NOT NULL AND v_room_code IS NOT NULL AND upper(trim(_access_code)) = upper(trim(v_room_code)))
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
END;
$$;

REVOKE ALL ON FUNCTION public.swap_simulation_assignment(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.swap_simulation_assignment(uuid, uuid, text) TO anon, authenticated;