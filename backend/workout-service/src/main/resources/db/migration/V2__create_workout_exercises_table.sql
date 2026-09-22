CREATE TABLE workout_exercises (
    id UUID PRIMARY KEY,
    workout_id UUID NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    name VARCHAR(150) NOT NULL,
    sets INTEGER,
    reps INTEGER,
    weight_kg NUMERIC(10, 2),
    one_rm_kg NUMERIC(10, 2),
    max_weight_kg NUMERIC(10, 2),
    max_reps INTEGER,
    notes VARCHAR(500),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_workout_exercises_workout
        FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,

    CONSTRAINT chk_exercise_sets
        CHECK (sets IS NULL OR sets > 0),

    CONSTRAINT chk_exercise_reps
        CHECK (reps IS NULL OR reps > 0),

    CONSTRAINT chk_exercise_max_reps
        CHECK (max_reps IS NULL OR max_reps > 0),

    CONSTRAINT chk_exercise_weight
        CHECK (weight_kg IS NULL OR weight_kg >= 0),

    CONSTRAINT chk_exercise_one_rm
        CHECK (one_rm_kg IS NULL OR one_rm_kg >= 0),

    CONSTRAINT chk_exercise_max_weight
        CHECK (max_weight_kg IS NULL OR max_weight_kg >= 0)
);

CREATE INDEX idx_workout_exercises_workout
    ON workout_exercises(workout_id);

CREATE INDEX idx_workout_exercises_user_workout
    ON workout_exercises(user_id, workout_id);
