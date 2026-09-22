ALTER TABLE nutrition_targets
    ADD COLUMN IF NOT EXISTS fiber_g_target NUMERIC(7, 2) NOT NULL DEFAULT 30,
    ADD COLUMN IF NOT EXISTS nutrition_goal VARCHAR(20) NOT NULL DEFAULT 'MAINTENANCE',
    ADD COLUMN IF NOT EXISTS manual_override BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE nutrition_targets
    DROP CONSTRAINT IF EXISTS chk_nutrition_targets_goal;

ALTER TABLE nutrition_targets
    ADD CONSTRAINT chk_nutrition_targets_goal
        CHECK (nutrition_goal IN ('CUTTING', 'BULKING', 'MAINTENANCE', 'RECOMPOSITION'));

ALTER TABLE nutrition_targets
    DROP CONSTRAINT IF EXISTS chk_nutrition_targets_positive;

ALTER TABLE nutrition_targets
    ADD CONSTRAINT chk_nutrition_targets_positive
        CHECK (
            calorie_target > 0
            AND protein_g_target >= 0
            AND carbs_g_target >= 0
            AND fat_g_target >= 0
            AND fiber_g_target >= 0
            AND water_ml_target > 0
        );
