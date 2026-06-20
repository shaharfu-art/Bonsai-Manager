-- Storage policies for bonsai-photos bucket
-- Run this in Supabase SQL Editor if storage uploads fail

INSERT INTO storage.buckets (id, name, public)
VALUES ('bonsai-photos', 'bonsai-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'bonsai-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'bonsai-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'bonsai-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
