-- Fix storage RLS to allow signed URL generation and file access
-- Run this in Supabase SQL Editor

-- Make sure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('bonsai-photos', 'bonsai-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;

-- Recreate policies with proper role targeting
CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bonsai-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'bonsai-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'bonsai-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'bonsai-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
