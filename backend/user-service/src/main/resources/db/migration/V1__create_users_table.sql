CREATE TABLE users (
    id UUID PRIMARY KEY,
    firebase_uid VARCHAR(128) NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(150) NOT NULL,
    height_cm NUMERIC(5, 2),
    weight_kg NUMERIC(5, 2),
    date_of_birth DATE,
    gender VARCHAR(20),
    fitness_goal VARCHAR(50),
    activity_level VARCHAR(50),
    preferred_units VARCHAR(20) NOT NULL DEFAULT 'METRIC',
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT uq_users_firebase_uid UNIQUE (firebase_uid),

    CONSTRAINT chk_users_height
        CHECK (height_cm IS NULL OR height_cm > 0),

    CONSTRAINT chk_users_weight
        CHECK (weight_kg IS NULL OR weight_kg > 0),

    CONSTRAINT chk_users_gender
        CHECK (
            gender IS NULL
            OR gender IN ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY')
        ),

    CONSTRAINT chk_users_fitness_goal
        CHECK (
            fitness_goal IS NULL
            OR fitness_goal IN (
                'LOSE_WEIGHT',
                'BUILD_MUSCLE',
                'STAY_FIT',
                'ENDURANCE',
                'GENERAL_HEALTH'
            )
        ),

    CONSTRAINT chk_users_activity_level
        CHECK (
            activity_level IS NULL
            OR activity_level IN (
                'SEDENTARY',
                'LIGHT',
                'MODERATE',
                'ACTIVE',
                'VERY_ACTIVE'
            )
        ),

    CONSTRAINT chk_users_preferred_units
        CHECK (preferred_units IN ('METRIC', 'IMPERIAL'))
);

CREATE INDEX idx_users_firebase_uid
    ON users (firebase_uid);
