-- Payment logs table — tracks all payment events from Morning webhooks
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- payment.success, payment.failed, subscription.cancelled, etc.
  amount numeric DEFAULT 0,
  currency text DEFAULT 'ILS',
  provider_transaction_id text,
  raw_payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS: users can read their own payment logs
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment logs"
ON payment_logs FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert (from webhook Edge Function)
CREATE POLICY "Service role can insert payment logs"
ON payment_logs FOR INSERT
WITH CHECK (true);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON payment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON payment_logs(created_at DESC);
