ALTER TABLE meals
    DROP CONSTRAINT IF EXISTS chk_meals_type;

ALTER TABLE meals
    ALTER COLUMN meal_type TYPE VARCHAR(24);

ALTER TABLE meals
    ADD CONSTRAINT chk_meals_type
        CHECK (meal_type IN (
            'BREAKFAST',
            'LUNCH',
            'DINNER',
            'SNACK',
            'PRE_WORKOUT',
            'POST_WORKOUT'
        ));

ALTER TABLE meals
    ADD COLUMN IF NOT EXISTS quantity NUMERIC(10, 2) NOT NULL DEFAULT 1;

ALTER TABLE meals
    ADD COLUMN IF NOT EXISTS quantity_unit VARCHAR(20) NOT NULL DEFAULT 'GRAMS';

ALTER TABLE meals
    DROP CONSTRAINT IF EXISTS chk_meals_quantity;

ALTER TABLE meals
    ADD CONSTRAINT chk_meals_quantity
        CHECK (quantity > 0);

ALTER TABLE meals
    DROP CONSTRAINT IF EXISTS chk_meals_quantity_unit;

ALTER TABLE meals
    ADD CONSTRAINT chk_meals_quantity_unit
        CHECK (quantity_unit IN ('GRAMS', 'ML', 'PIECES', 'SERVINGS', 'CUPS'));
