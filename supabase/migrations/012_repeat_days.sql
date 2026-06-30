-- Add repeat_days field to treatment_logs for recurring treatments
ALTER TABLE treatment_logs
  ADD COLUMN IF NOT EXISTS repeat_days INTEGER DEFAULT NULL;
