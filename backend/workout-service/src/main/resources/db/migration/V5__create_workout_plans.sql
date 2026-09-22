CREATE TABLE workout_plans (
    id UUID PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    name VARCHAR(150) NOT NULL,
    template_type VARCHAR(30) NOT NULL,
    description VARCHAR(1000),
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT chk_workout_plans_type
        CHECK (template_type IN ('PPL', 'UPPER_LOWER', 'CUSTOM'))
);

CREATE INDEX idx_workout_plans_user
    ON workout_plans (user_id, archived, updated_at DESC);

CREATE TABLE workout_plan_days (
    id UUID PRIMARY KEY,
    plan_id UUID NOT NULL,
    day_label VARCHAR(80) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_workout_plan_days_plan
        FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
);

CREATE INDEX idx_workout_plan_days_plan
    ON workout_plan_days (plan_id, sort_order);

CREATE TABLE workout_plan_exercises (
    id UUID PRIMARY KEY,
    plan_day_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    target_sets INTEGER,
    target_reps INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    notes VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_workout_plan_exercises_day
        FOREIGN KEY (plan_day_id) REFERENCES workout_plan_days(id) ON DELETE CASCADE,

    CONSTRAINT chk_plan_exercise_sets
        CHECK (target_sets IS NULL OR target_sets > 0),

    CONSTRAINT chk_plan_exercise_reps
        CHECK (target_reps IS NULL OR target_reps > 0)
);

CREATE INDEX idx_workout_plan_exercises_day
    ON workout_plan_exercises (plan_day_id, sort_order);
