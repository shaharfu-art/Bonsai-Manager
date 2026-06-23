-- Add language preference to push subscriptions
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'he';
