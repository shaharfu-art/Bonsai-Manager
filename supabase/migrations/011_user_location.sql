-- Add location fields to user_profiles for weather alerts
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS trees_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS trees_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS trees_city TEXT;
