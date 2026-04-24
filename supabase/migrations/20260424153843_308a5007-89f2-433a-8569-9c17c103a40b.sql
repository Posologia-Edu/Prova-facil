-- Enable realtime for mock_trial_responses so Judge panel updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.mock_trial_responses;
ALTER TABLE public.mock_trial_responses REPLICA IDENTITY FULL;