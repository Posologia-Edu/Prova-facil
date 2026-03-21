
ALTER TABLE public.reconciliation_rooms
  DROP CONSTRAINT reconciliation_rooms_soap_room_id_fkey,
  ADD CONSTRAINT reconciliation_rooms_soap_room_id_fkey
    FOREIGN KEY (soap_room_id) REFERENCES public.soap_rooms(id) ON DELETE SET NULL;

ALTER TABLE public.documentation_rooms
  DROP CONSTRAINT documentation_rooms_reconciliation_room_id_fkey,
  ADD CONSTRAINT documentation_rooms_reconciliation_room_id_fkey
    FOREIGN KEY (reconciliation_room_id) REFERENCES public.reconciliation_rooms(id) ON DELETE SET NULL;
