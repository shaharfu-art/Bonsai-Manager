-- Add email column to user_profiles and sync from auth.users
-- Run this in Supabase SQL Editor

-- 1. Add email column
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Copy existing emails from auth.users
UPDATE user_profiles
SET email = au.email
FROM auth.users au
WHERE user_profiles.id = au.id
AND user_profiles.email IS NULL;

-- 3. Update the trigger to also copy email on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, email)
  VALUES (NEW.id, 'user', NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Index for fast email lookup (used by payment webhook)
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
