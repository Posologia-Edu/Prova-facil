CREATE OR REPLACE FUNCTION public.set_simulation_assignment_case(_assignment_id uuid, _case_index int, _access_code text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_owner uuid;
  v_room_code text;
BEGIN
  SELECT rm.user_id, rm.access_code
    INTO v_room_owner, v_room_code
  FROM public.simulation_round_assignments a
  JOIN public.simulation_rounds r ON r.id = a.round_id
  JOIN public.simulation_rooms rm ON rm.id = r.room_id
  WHERE a.id = _assignment_id;

  IF v_room_owner IS NULL AND v_room_code IS NULL THEN
    RAISE EXCEPTION 'Atribuição não encontrada';
  END IF;

  IF NOT (
    (auth.uid() IS NOT NULL AND auth.uid() = v_room_owner)
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
    OR (_access_code IS NOT NULL AND v_room_code IS NOT NULL AND upper(trim(_access_code)) = upper(trim(v_room_code)))
  ) THEN
    RAISE EXCEPTION 'Sem permissão para alterar o caso desta sala';
  END IF;

  UPDATE public.simulation_round_assignments
     SET case_index = _case_index
   WHERE id = _assignment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_simulation_assignment_case(uuid, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_simulation_assignment_case(uuid, int, text) TO authenticated, service_role;