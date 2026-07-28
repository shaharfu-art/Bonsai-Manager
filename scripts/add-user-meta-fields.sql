-- Add display_name, last_os, last_user_agent to user_profiles
-- Run in Supabase SQL Editor

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_os text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_user_agent text;

-- Sync display names from existing Google users (if available in auth metadata)
-- This is a one-time backfill; new users get it automatically on login
