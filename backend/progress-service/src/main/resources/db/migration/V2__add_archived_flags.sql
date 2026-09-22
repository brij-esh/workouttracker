ALTER TABLE weight_logs
    ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE personal_records
    ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_weight_logs_user_active
    ON weight_logs (user_id, recorded_on DESC)
    WHERE archived = FALSE;

CREATE INDEX idx_personal_records_user_active
    ON personal_records (user_id, recorded_on DESC)
    WHERE archived = FALSE;
