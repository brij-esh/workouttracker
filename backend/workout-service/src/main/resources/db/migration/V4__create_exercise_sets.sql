CREATE TABLE exercise_sets (
    id UUID PRIMARY KEY,
    exercise_id UUID NOT NULL,
    workout_id UUID NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    set_number INTEGER NOT NULL,
    reps INTEGER,
    weight_kg NUMERIC(10, 2),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    rest_seconds INTEGER,
    notes VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_exercise_sets_exercise
        FOREIGN KEY (exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE,

    CONSTRAINT fk_exercise_sets_workout
        FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,

    CONSTRAINT chk_exercise_sets_number
        CHECK (set_number > 0),

    CONSTRAINT chk_exercise_sets_reps
        CHECK (reps IS NULL OR reps > 0),

    CONSTRAINT chk_exercise_sets_weight
        CHECK (weight_kg IS NULL OR weight_kg >= 0),

    CONSTRAINT chk_exercise_sets_rest
        CHECK (rest_seconds IS NULL OR rest_seconds >= 0)
);

CREATE INDEX idx_exercise_sets_exercise
    ON exercise_sets (exercise_id, set_number);

CREATE INDEX idx_exercise_sets_user_workout
    ON exercise_sets (user_id, workout_id);
