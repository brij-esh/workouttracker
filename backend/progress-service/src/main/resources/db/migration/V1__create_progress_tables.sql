CREATE TABLE weight_logs (
    id UUID PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    recorded_on DATE NOT NULL,
    weight_kg NUMERIC(6, 2) NOT NULL,
    notes VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT chk_weight_logs_weight
        CHECK (weight_kg > 0)
);

CREATE INDEX idx_weight_logs_user_recorded
    ON weight_logs (user_id, recorded_on DESC);

CREATE TABLE body_measurements (
    id UUID PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    recorded_on DATE NOT NULL,
    chest_cm NUMERIC(6, 2),
    waist_cm NUMERIC(6, 2),
    hips_cm NUMERIC(6, 2),
    left_arm_cm NUMERIC(6, 2),
    right_arm_cm NUMERIC(6, 2),
    left_thigh_cm NUMERIC(6, 2),
    right_thigh_cm NUMERIC(6, 2),
    neck_cm NUMERIC(6, 2),
    notes VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT chk_body_measurements_positive
        CHECK (
            (chest_cm IS NULL OR chest_cm > 0)
            AND (waist_cm IS NULL OR waist_cm > 0)
            AND (hips_cm IS NULL OR hips_cm > 0)
            AND (left_arm_cm IS NULL OR left_arm_cm > 0)
            AND (right_arm_cm IS NULL OR right_arm_cm > 0)
            AND (left_thigh_cm IS NULL OR left_thigh_cm > 0)
            AND (right_thigh_cm IS NULL OR right_thigh_cm > 0)
            AND (neck_cm IS NULL OR neck_cm > 0)
        )
);

CREATE INDEX idx_body_measurements_user_recorded
    ON body_measurements (user_id, recorded_on DESC);

CREATE TABLE personal_records (
    id UUID PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    exercise_name VARCHAR(150) NOT NULL,
    record_type VARCHAR(30) NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    recorded_on DATE NOT NULL,
    notes VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT chk_personal_records_type
        CHECK (record_type IN ('WEIGHT_KG', 'REPS', 'DURATION_SECONDS', 'DISTANCE_M')),

    CONSTRAINT chk_personal_records_value
        CHECK (value > 0)
);

CREATE INDEX idx_personal_records_user_exercise
    ON personal_records (user_id, exercise_name, recorded_on DESC);
