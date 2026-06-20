CREATE TABLE IF NOT EXISTS species (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_he text NOT NULL,
  name_en text NOT NULL,
  name_latin text,
  type text NOT NULL CHECK (type IN ('tropical','temperate','conifer','deciduous')),
  seasonal_care_rules jsonb DEFAULT '{}',
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE species ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Species are publicly readable"
  ON species FOR SELECT
  USING (true);
