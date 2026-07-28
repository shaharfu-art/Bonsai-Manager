-- DEV Migration Part 2: Storage policies
-- Run AFTER creating the bucket 'bonsai-photos' manually in Supabase Dashboard → Storage

CREATE POLICY "Users upload own photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'bonsai-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users read own photos" ON storage.objects FOR SELECT USING (bucket_id = 'bonsai-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own photos" ON storage.objects FOR DELETE USING (bucket_id = 'bonsai-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
