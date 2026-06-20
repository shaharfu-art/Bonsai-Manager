CREATE TABLE IF NOT EXISTS alert_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  treatment_type text NOT NULL CHECK (treatment_type IN (
    'watering','fertilizing','branch_pruning','root_pruning',
    'wiring','wire_removal','repotting','pest_treatment',
    'shading','sun_exposure','winter_dormancy','other'
  )),
  interval_days integer,
  season text CHECK (season IN ('spring','summer','autumn','winter')),
  is_manual_only boolean DEFAULT false,
  snoozed_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tree_id, treatment_type)
);

ALTER TABLE alert_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own alert configs" ON alert_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own alert configs" ON alert_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own alert configs" ON alert_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own alert configs" ON alert_configs FOR DELETE USING (auth.uid() = user_id);
