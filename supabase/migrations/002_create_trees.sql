CREATE TABLE IF NOT EXISTS trees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_name text NOT NULL,
  species_id uuid REFERENCES species(id),
  species_free_text text,
  style text,
  age_years integer,
  origin text CHECK (origin IN ('collected','nursery','seed','cutting')),
  pot_type text,
  pot_size text,
  location text CHECK (location IN ('indoors','outdoors','greenhouse')),
  date_added date,
  notes text,
  cover_photo_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own trees" ON trees FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own trees" ON trees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own trees" ON trees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own trees" ON trees FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trees_updated_at
  BEFORE UPDATE ON trees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
