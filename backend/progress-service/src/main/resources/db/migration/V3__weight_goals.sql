CREATE TABLE IF NOT EXISTS weight_goals (
    user_id     VARCHAR(128) PRIMARY KEY,
    goal_kg     NUMERIC(5, 2) NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
