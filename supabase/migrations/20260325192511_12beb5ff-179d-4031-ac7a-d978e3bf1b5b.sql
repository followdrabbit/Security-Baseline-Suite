CREATE POLICY "Users can upload source documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'source-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own source documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'source-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own source documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'source-documents' AND (storage.foldername(name))[1] = auth.uid()::text);