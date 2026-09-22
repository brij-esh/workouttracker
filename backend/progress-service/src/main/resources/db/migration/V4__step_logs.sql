CREATE TABLE step_logs (
    id UUID PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    recorded_on DATE NOT NULL,
    steps INTEGER NOT NULL,
    calories_burned INTEGER NOT NULL,
    source VARCHAR(20) NOT NULL,
    source_label VARCHAR(80),
    weight_kg NUMERIC(6, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT uq_step_logs_user_day UNIQUE (user_id, recorded_on),
    CONSTRAINT chk_step_logs_steps CHECK (steps >= 0 AND steps <= 200000),
    CONSTRAINT chk_step_logs_calories CHECK (calories_burned >= 0 AND calories_burned <= 20000),
    CONSTRAINT chk_step_logs_source CHECK (source IN ('MANUAL', 'DEVICE', 'WEARABLE')),
    CONSTRAINT chk_step_logs_weight CHECK (weight_kg IS NULL OR weight_kg > 0)
);

CREATE INDEX idx_step_logs_user_recorded
    ON step_logs (user_id, recorded_on DESC);
