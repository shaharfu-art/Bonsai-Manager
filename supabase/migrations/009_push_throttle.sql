-- Track when last push was sent per alert config to avoid spamming
ALTER TABLE alert_configs ADD COLUMN IF NOT EXISTS last_push_sent_at timestamptz;
