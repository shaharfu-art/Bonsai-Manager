-- Add status column to treatment_logs for pending/completed workflow
ALTER TABLE treatment_logs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed'));

-- Index for quick lookup of pending treatments
CREATE INDEX IF NOT EXISTS idx_treatment_logs_status ON treatment_logs(status) WHERE status = 'pending';
