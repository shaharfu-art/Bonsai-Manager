-- DEV Migration Part 1: Tables and RLS (run first)

-- 1. User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  email text,
  display_name text,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'pro')),
  max_trees integer NOT NULL DEFAULT 3,
  plan_expires_at timestamptz,
  payment_provider text,
  payment_customer_id text,
  trees_lat double precision,
  trees_lng double precision,
  trees_city text,
  last_os text,
  last_user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, email, max_trees, plan)
  VALUES (NEW.id, 'user', NEW.email, 3, 'free')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Species
CREATE TABLE IF NOT EXISTS species (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_he text NOT NULL,
  name_en text NOT NULL,
  name_latin text,
  type text DEFAULT 'tropical',
  is_system boolean DEFAULT true
);

ALTER TABLE species ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read species" ON species FOR SELECT TO authenticated USING (true);

-- 3. Trees
CREATE TABLE IF NOT EXISTS trees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_name text NOT NULL,
  species_id uuid REFERENCES species(id),
  species_free_text text,
  style text,
  age_years integer,
  origin text,
  pot_type text,
  pot_size text,
  location text,
  substrate text,
  date_added text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own trees" ON trees FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Photos
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text,
  photo_date text,
  caption text,
  is_cover boolean DEFAULT false,
  treatment_log_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own photos" ON photos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Treatment logs
CREATE TABLE IF NOT EXISTS treatment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  treatment_type text NOT NULL,
  treatment_date text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  notes text,
  repeat_days integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE treatment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own treatments" ON treatment_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Alert configs
CREATE TABLE IF NOT EXISTS alert_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  treatment_type text NOT NULL,
  interval_days integer,
  snoozed_until text,
  is_manual_only boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tree_id, treatment_type, user_id)
);

ALTER TABLE alert_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own alerts" ON alert_configs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Payment logs
CREATE TABLE IF NOT EXISTS payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  amount numeric DEFAULT 0,
  currency text DEFAULT 'ILS',
  provider_transaction_id text,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payments" ON payment_logs FOR SELECT USING (auth.uid() = user_id);
