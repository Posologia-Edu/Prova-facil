ALTER TABLE public.virtual_patient_messages REPLICA IDENTITY FULL;
ALTER TABLE public.virtual_patient_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.virtual_patient_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.virtual_patient_sessions;