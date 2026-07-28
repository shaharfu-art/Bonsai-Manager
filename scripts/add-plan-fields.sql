-- Run in Supabase SQL Editor to add subscription plan fields
-- Supports 3 tiers: free (3 trees), premium (15 trees), pro (unlimited)

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'pro'));
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS payment_provider text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS payment_customer_id text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS max_trees integer NOT NULL DEFAULT 3;

-- Update existing users to free plan with 3 tree limit
UPDATE user_profiles SET plan = 'free', max_trees = 3 WHERE plan IS NULL;

-- Plan limits reference:
-- free:    max_trees = 3,    AI = 2/day
-- premium: max_trees = 15,   AI = unlimited  → ₪9.90/month or ₪99/year
-- pro:     max_trees = 9999, AI = unlimited  → ₪16.90/month or ₪169/year

-- To manually upgrade a user to premium:
-- UPDATE user_profiles SET plan = 'premium', max_trees = 15, plan_expires_at = now() + interval '1 month' WHERE id = 'USER_UUID';

-- To manually upgrade a user to pro:
-- UPDATE user_profiles SET plan = 'pro', max_trees = 9999, plan_expires_at = now() + interval '1 month' WHERE id = 'USER_UUID';
