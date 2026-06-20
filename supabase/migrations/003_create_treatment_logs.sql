CREATE TABLE IF NOT EXISTS treatment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  treatment_date date NOT NULL,
  treatment_type text NOT NULL CHECK (treatment_type IN (
    'watering','fertilizing','branch_pruning','root_pruning',
    'wiring','wire_removal','repotting','pest_treatment',
    'shading','sun_exposure','winter_dormancy','other'
  )),
  notes text,
  photo_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE treatment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own treatments" ON treatment_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own treatments" ON treatment_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own treatments" ON treatment_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own treatments" ON treatment_logs FOR DELETE USING (auth.uid() = user_id);
