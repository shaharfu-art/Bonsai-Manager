CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text,
  photo_date date NOT NULL,
  caption text,
  is_cover boolean DEFAULT false,
  treatment_log_id uuid REFERENCES treatment_logs(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own photos" ON photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own photos" ON photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own photos" ON photos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own photos" ON photos FOR DELETE USING (auth.uid() = user_id);
