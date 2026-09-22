ALTER TABLE workouts
    ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE workout_exercises
    ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_workouts_user_active
    ON workouts (user_id, workout_date DESC)
    WHERE archived = FALSE;

CREATE INDEX idx_workout_exercises_workout_active
    ON workout_exercises (workout_id, created_at DESC)
    WHERE archived = FALSE;
