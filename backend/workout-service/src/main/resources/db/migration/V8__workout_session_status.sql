ALTER TABLE workouts
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
    ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS elapsed_ms BIGINT;

UPDATE workouts
SET completed_at = COALESCE(completed_at, updated_at, created_at)
WHERE status = 'COMPLETED'
  AND completed_at IS NULL;

ALTER TABLE workouts
    DROP CONSTRAINT IF EXISTS chk_workout_status;

ALTER TABLE workouts
    ADD CONSTRAINT chk_workout_status
        CHECK (status IN ('IN_PROGRESS', 'PAUSED', 'COMPLETED'));

CREATE INDEX IF NOT EXISTS idx_workouts_user_status
    ON workouts(user_id, status);
