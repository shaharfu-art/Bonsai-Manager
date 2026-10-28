CREATE TABLE IF NOT EXISTS light_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  period text NOT NULL CHECK (period IN ('morning', 'noon', 'evening')),
  lux_value integer NOT NULL,
  method text NOT NULL DEFAULT 'camera' CHECK (method IN ('camera', 'sensor', 'manual')),
  measured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE light_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own light readings" ON light_readings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_light_readings_tree_session ON light_readings(tree_id, session_id);

CREATE TABLE IF NOT EXISTS light_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL UNIQUE,
  avg_lux integer NOT NULL,
  max_lux integer NOT NULL,
  min_lux integer NOT NULL,
  category text NOT NULL CHECK (category IN ('deep_shade', 'shade', 'partial_shade', 'bright_indirect', 'direct_sun', 'full_sun')),
  ai_recommendation text,
  assessed_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE light_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own light assessments" ON light_assessments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_light_assessments_tree ON light_assessments(tree_id, assessed_at DESC);
