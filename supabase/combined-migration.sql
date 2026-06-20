-- ════════════════════════════════════════════════════════════
-- Bonsai Manager: Complete Migration + Seed
-- Copy this ENTIRE file into Supabase SQL Editor and click Run
-- ════════════════════════════════════════════════════════════

-- ────────────────────────────────────────
-- 1. Species table
-- ────────────────────────────────────────

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

DROP POLICY IF EXISTS "Species are publicly readable" ON species;
CREATE POLICY "Species are publicly readable"
  ON species FOR SELECT
  USING (true);

-- ────────────────────────────────────────
-- 2. Trees table
-- ────────────────────────────────────────

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

DROP POLICY IF EXISTS "Users see own trees" ON trees;
DROP POLICY IF EXISTS "Users insert own trees" ON trees;
DROP POLICY IF EXISTS "Users update own trees" ON trees;
DROP POLICY IF EXISTS "Users delete own trees" ON trees;

CREATE POLICY "Users see own trees" ON trees FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own trees" ON trees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own trees" ON trees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own trees" ON trees FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trees_updated_at ON trees;
CREATE TRIGGER trees_updated_at
  BEFORE UPDATE ON trees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────
-- 3. Treatment logs table
-- ────────────────────────────────────────

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

DROP POLICY IF EXISTS "Users see own treatments" ON treatment_logs;
DROP POLICY IF EXISTS "Users insert own treatments" ON treatment_logs;
DROP POLICY IF EXISTS "Users update own treatments" ON treatment_logs;
DROP POLICY IF EXISTS "Users delete own treatments" ON treatment_logs;

CREATE POLICY "Users see own treatments" ON treatment_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own treatments" ON treatment_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own treatments" ON treatment_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own treatments" ON treatment_logs FOR DELETE USING (auth.uid() = user_id);

-- ────────────────────────────────────────
-- 4. Photos table
-- ────────────────────────────────────────

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

DROP POLICY IF EXISTS "Users see own photos" ON photos;
DROP POLICY IF EXISTS "Users insert own photos" ON photos;
DROP POLICY IF EXISTS "Users update own photos" ON photos;
DROP POLICY IF EXISTS "Users delete own photos" ON photos;

CREATE POLICY "Users see own photos" ON photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own photos" ON photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own photos" ON photos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own photos" ON photos FOR DELETE USING (auth.uid() = user_id);

-- ────────────────────────────────────────
-- 5. Alert configs table
-- ────────────────────────────────────────

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

DROP POLICY IF EXISTS "Users see own alert configs" ON alert_configs;
DROP POLICY IF EXISTS "Users insert own alert configs" ON alert_configs;
DROP POLICY IF EXISTS "Users update own alert configs" ON alert_configs;
DROP POLICY IF EXISTS "Users delete own alert configs" ON alert_configs;

CREATE POLICY "Users see own alert configs" ON alert_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own alert configs" ON alert_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own alert configs" ON alert_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own alert configs" ON alert_configs FOR DELETE USING (auth.uid() = user_id);

-- ────────────────────────────────────────
-- 6. Seed: 10 Bonsai Species
-- ────────────────────────────────────────

INSERT INTO species (name_he, name_en, name_latin, type, seasonal_care_rules, is_system)
SELECT * FROM (VALUES

('פיקוס', 'Ficus', 'Ficus retusa', 'tropical', '{"spring":{"watering":{"interval_days":3},"fertilizing":{"interval_days":14},"repotting":{"interval_days":730},"branch_pruning":{"interval_days":30}},"summer":{"watering":{"interval_days":2},"fertilizing":{"interval_days":14},"shading":{"interval_days":90}},"autumn":{"watering":{"interval_days":4},"fertilizing":{"interval_days":21},"wiring":{"interval_days":180}},"winter":{"watering":{"interval_days":7},"fertilizing":{"interval_days":30},"winter_dormancy":{"interval_days":365}}}'::jsonb, true),

('ערער', 'Juniper', 'Juniperus chinensis', 'conifer', '{"spring":{"watering":{"interval_days":2},"fertilizing":{"interval_days":14},"repotting":{"interval_days":730},"branch_pruning":{"interval_days":21}},"summer":{"watering":{"interval_days":1},"fertilizing":{"interval_days":14},"wiring":{"interval_days":180}},"autumn":{"watering":{"interval_days":3},"fertilizing":{"interval_days":21},"wire_removal":{"interval_days":180}},"winter":{"watering":{"interval_days":5},"winter_dormancy":{"interval_days":365}}}'::jsonb, true),

('מייפל יפני', 'Japanese Maple', 'Acer palmatum', 'deciduous', '{"spring":{"watering":{"interval_days":2},"fertilizing":{"interval_days":14},"repotting":{"interval_days":730},"branch_pruning":{"interval_days":30}},"summer":{"watering":{"interval_days":1},"fertilizing":{"interval_days":21},"shading":{"interval_days":90}},"autumn":{"watering":{"interval_days":3},"fertilizing":{"interval_days":30},"wiring":{"interval_days":180}},"winter":{"watering":{"interval_days":7},"winter_dormancy":{"interval_days":365}}}'::jsonb, true),

('אלם סיני', 'Chinese Elm', 'Ulmus parvifolia', 'deciduous', '{"spring":{"watering":{"interval_days":2},"fertilizing":{"interval_days":14},"repotting":{"interval_days":730},"branch_pruning":{"interval_days":21}},"summer":{"watering":{"interval_days":1},"fertilizing":{"interval_days":14},"pest_treatment":{"interval_days":30}},"autumn":{"watering":{"interval_days":3},"fertilizing":{"interval_days":21},"wiring":{"interval_days":180}},"winter":{"watering":{"interval_days":5},"winter_dormancy":{"interval_days":365}}}'::jsonb, true),

('אורן', 'Pine', 'Pinus thunbergii', 'conifer', '{"spring":{"watering":{"interval_days":2},"fertilizing":{"interval_days":14},"branch_pruning":{"interval_days":90}},"summer":{"watering":{"interval_days":2},"fertilizing":{"interval_days":21},"root_pruning":{"interval_days":1460}},"autumn":{"watering":{"interval_days":3},"fertilizing":{"interval_days":14},"wiring":{"interval_days":180}},"winter":{"watering":{"interval_days":7},"winter_dormancy":{"interval_days":365}}}'::jsonb, true),

('זית', 'Olive', 'Olea europaea', 'temperate', '{"spring":{"watering":{"interval_days":3},"fertilizing":{"interval_days":14},"repotting":{"interval_days":1095},"branch_pruning":{"interval_days":30}},"summer":{"watering":{"interval_days":2},"fertilizing":{"interval_days":21},"sun_exposure":{"interval_days":90}},"autumn":{"watering":{"interval_days":4},"fertilizing":{"interval_days":30},"wiring":{"interval_days":180}},"winter":{"watering":{"interval_days":7},"winter_dormancy":{"interval_days":365}}}'::jsonb, true),

('רימון', 'Pomegranate', 'Punica granatum', 'tropical', '{"spring":{"watering":{"interval_days":2},"fertilizing":{"interval_days":14},"repotting":{"interval_days":730},"branch_pruning":{"interval_days":30}},"summer":{"watering":{"interval_days":2},"fertilizing":{"interval_days":14},"sun_exposure":{"interval_days":90}},"autumn":{"watering":{"interval_days":3},"fertilizing":{"interval_days":30},"wiring":{"interval_days":180}},"winter":{"watering":{"interval_days":10},"winter_dormancy":{"interval_days":365}}}'::jsonb, true),

('אזלאה', 'Azalea', 'Rhododendron indicum', 'temperate', '{"spring":{"watering":{"interval_days":2},"fertilizing":{"interval_days":14},"repotting":{"interval_days":730},"branch_pruning":{"interval_days":30}},"summer":{"watering":{"interval_days":1},"fertilizing":{"interval_days":14},"shading":{"interval_days":90}},"autumn":{"watering":{"interval_days":3},"fertilizing":{"interval_days":21},"wiring":{"interval_days":180}},"winter":{"watering":{"interval_days":5},"winter_dormancy":{"interval_days":365}}}'::jsonb, true),

('מייפל תלת-שיני', 'Trident Maple', 'Acer buergerianum', 'deciduous', '{"spring":{"watering":{"interval_days":2},"fertilizing":{"interval_days":14},"repotting":{"interval_days":730},"branch_pruning":{"interval_days":21}},"summer":{"watering":{"interval_days":1},"fertilizing":{"interval_days":14},"root_pruning":{"interval_days":730}},"autumn":{"watering":{"interval_days":3},"fertilizing":{"interval_days":21},"wiring":{"interval_days":180}},"winter":{"watering":{"interval_days":7},"winter_dormancy":{"interval_days":365}}}'::jsonb, true),

('בוגנוויליה', 'Bougainvillea', 'Bougainvillea spectabilis', 'tropical', '{"spring":{"watering":{"interval_days":2},"fertilizing":{"interval_days":14},"repotting":{"interval_days":730},"branch_pruning":{"interval_days":30}},"summer":{"watering":{"interval_days":2},"fertilizing":{"interval_days":14},"sun_exposure":{"interval_days":90}},"autumn":{"watering":{"interval_days":3},"fertilizing":{"interval_days":30},"wiring":{"interval_days":180}},"winter":{"watering":{"interval_days":10},"winter_dormancy":{"interval_days":365}}}'::jsonb, true)

) AS v(name_he, name_en, name_latin, type, seasonal_care_rules, is_system)
WHERE NOT EXISTS (SELECT 1 FROM species WHERE name_en = v.name_en);

-- ════════════════════════════════════════════════════════════
-- Done! You should now have 5 tables and 10 species rows.
-- ════════════════════════════════════════════════════════════
