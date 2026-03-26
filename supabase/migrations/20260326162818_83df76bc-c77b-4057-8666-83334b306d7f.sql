
INSERT INTO storage.buckets (id, name, public) VALUES ('question-images', 'question-images', true);

CREATE POLICY "Authenticated users can upload question images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'question-images');

CREATE POLICY "Anyone can view question images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'question-images');

CREATE POLICY "Users can delete own question images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'question-images' AND (storage.foldername(name))[1] = auth.uid()::text);
