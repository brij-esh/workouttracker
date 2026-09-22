CREATE TABLE meals (
    id UUID PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    meal_date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    name VARCHAR(150) NOT NULL,
    calories INTEGER NOT NULL,
    protein_g NUMERIC(7, 2) NOT NULL DEFAULT 0,
    carbs_g NUMERIC(7, 2) NOT NULL DEFAULT 0,
    fat_g NUMERIC(7, 2) NOT NULL DEFAULT 0,
    notes VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT chk_meals_type
        CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK')),

    CONSTRAINT chk_meals_macros
        CHECK (
            calories >= 0
            AND protein_g >= 0
            AND carbs_g >= 0
            AND fat_g >= 0
        )
);

CREATE INDEX idx_meals_user_date
    ON meals (user_id, meal_date DESC);

CREATE TABLE water_logs (
    id UUID PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    logged_on DATE NOT NULL,
    amount_ml INTEGER NOT NULL,
    notes VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT chk_water_amount
        CHECK (amount_ml > 0)
);

CREATE INDEX idx_water_logs_user_date
    ON water_logs (user_id, logged_on DESC);

CREATE TABLE nutrition_targets (
    id UUID PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    calorie_target INTEGER NOT NULL,
    protein_g_target NUMERIC(7, 2) NOT NULL,
    carbs_g_target NUMERIC(7, 2) NOT NULL,
    fat_g_target NUMERIC(7, 2) NOT NULL,
    water_ml_target INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT uq_nutrition_targets_user UNIQUE (user_id),

    CONSTRAINT chk_nutrition_targets_positive
        CHECK (
            calorie_target > 0
            AND protein_g_target >= 0
            AND carbs_g_target >= 0
            AND fat_g_target >= 0
            AND water_ml_target > 0
        )
);
