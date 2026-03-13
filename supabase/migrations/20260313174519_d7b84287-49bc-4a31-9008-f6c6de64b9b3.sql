
-- Create osce_chat_messages table
CREATE TABLE public.osce_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id uuid NOT NULL REFERENCES public.osce_circuits(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES public.osce_stations(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.osce_circuit_students(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.osce_chat_messages ENABLE ROW LEVEL SECURITY;

-- Anon/authenticated can select
CREATE POLICY "Anyone can select chat messages"
ON public.osce_chat_messages FOR SELECT
TO anon, authenticated
USING (true);

-- Anon/authenticated can insert
CREATE POLICY "Anyone can insert chat messages"
ON public.osce_chat_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admin full access
CREATE POLICY "Admins can manage all chat messages"
ON public.osce_chat_messages FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.osce_chat_messages;
