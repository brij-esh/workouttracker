CREATE TABLE workout_plan_schedule (
    id UUID PRIMARY KEY,
    plan_id UUID NOT NULL,
    weekday VARCHAR(10) NOT NULL,
    plan_day_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT fk_plan_schedule_plan
        FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE,

    CONSTRAINT fk_plan_schedule_day
        FOREIGN KEY (plan_day_id) REFERENCES workout_plan_days(id) ON DELETE SET NULL,

    CONSTRAINT uq_plan_schedule_weekday
        UNIQUE (plan_id, weekday),

    CONSTRAINT chk_plan_schedule_weekday
        CHECK (weekday IN (
            'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
            'FRIDAY', 'SATURDAY', 'SUNDAY'
        ))
);

CREATE INDEX idx_plan_schedule_plan
    ON workout_plan_schedule (plan_id, weekday);
