CREATE TABLE food_items (
    id UUID PRIMARY KEY,
    user_id VARCHAR(128),
    name VARCHAR(150) NOT NULL,
    category VARCHAR(20) NOT NULL,
    region VARCHAR(30) NOT NULL DEFAULT 'PAN_INDIA',
    serving_qty NUMERIC(10, 2) NOT NULL,
    serving_unit VARCHAR(20) NOT NULL,
    calories INTEGER NOT NULL,
    protein_g NUMERIC(7, 2) NOT NULL DEFAULT 0,
    carbs_g NUMERIC(7, 2) NOT NULL DEFAULT 0,
    fat_g NUMERIC(7, 2) NOT NULL DEFAULT 0,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

    CONSTRAINT chk_food_items_category
        CHECK (category IN ('STAPLE', 'MEAL', 'CUSTOM')),

    CONSTRAINT chk_food_items_region
        CHECK (region IN (
            'PAN_INDIA',
            'NORTH',
            'SOUTH',
            'WEST',
            'EAST',
            'CENTRAL',
            'OTHER'
        )),

    CONSTRAINT chk_food_items_serving_unit
        CHECK (serving_unit IN ('GRAMS', 'ML', 'PIECES', 'SERVINGS', 'CUPS')),

    CONSTRAINT chk_food_items_macros
        CHECK (
            serving_qty > 0
            AND calories >= 0
            AND protein_g >= 0
            AND carbs_g >= 0
            AND fat_g >= 0
        ),

    CONSTRAINT chk_food_items_ownership
        CHECK (
            (is_system = TRUE AND user_id IS NULL)
            OR (is_system = FALSE AND user_id IS NOT NULL)
        )
);

CREATE INDEX idx_food_items_name_lower
    ON food_items (LOWER(name));

CREATE INDEX idx_food_items_user_active
    ON food_items (user_id, archived)
    WHERE archived = FALSE;

CREATE INDEX idx_food_items_system_category
    ON food_items (category, region)
    WHERE is_system = TRUE AND archived = FALSE;

-- Indian staples (typical household servings)
INSERT INTO food_items (
    id, user_id, name, category, region, serving_qty, serving_unit,
    calories, protein_g, carbs_g, fat_g, is_system, archived, created_at, updated_at
) VALUES
    ('a1000001-0001-4000-8000-000000000001', NULL, 'Roti', 'STAPLE', 'PAN_INDIA', 1, 'PIECES', 120, 3.0, 18.0, 3.5, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000002', NULL, 'Rice (cooked)', 'STAPLE', 'PAN_INDIA', 100, 'GRAMS', 130, 2.7, 28.0, 0.3, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000003', NULL, 'Dal', 'STAPLE', 'PAN_INDIA', 1, 'CUPS', 200, 12.0, 30.0, 3.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000004', NULL, 'Rajma', 'STAPLE', 'NORTH', 1, 'CUPS', 220, 13.0, 32.0, 2.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000005', NULL, 'Chole', 'STAPLE', 'NORTH', 1, 'CUPS', 240, 12.0, 35.0, 5.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000006', NULL, 'Paneer', 'STAPLE', 'NORTH', 100, 'GRAMS', 265, 18.0, 1.2, 20.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000007', NULL, 'Curd', 'STAPLE', 'PAN_INDIA', 100, 'GRAMS', 98, 3.5, 4.7, 4.3, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000008', NULL, 'Milk', 'STAPLE', 'PAN_INDIA', 200, 'ML', 120, 6.4, 9.6, 6.4, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000009', NULL, 'Poha', 'STAPLE', 'WEST', 1, 'SERVINGS', 250, 5.0, 45.0, 6.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-00000000000a', NULL, 'Upma', 'STAPLE', 'SOUTH', 1, 'SERVINGS', 220, 5.0, 35.0, 7.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-00000000000b', NULL, 'Idli', 'STAPLE', 'SOUTH', 2, 'PIECES', 120, 4.0, 24.0, 0.5, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-00000000000c', NULL, 'Dosa', 'STAPLE', 'SOUTH', 1, 'PIECES', 150, 4.0, 26.0, 3.5, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-00000000000d', NULL, 'Paratha', 'STAPLE', 'NORTH', 1, 'PIECES', 200, 5.0, 28.0, 8.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-00000000000e', NULL, 'Sambar', 'STAPLE', 'SOUTH', 1, 'CUPS', 110, 5.0, 16.0, 3.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-00000000000f', NULL, 'Thepla', 'STAPLE', 'WEST', 1, 'PIECES', 130, 3.5, 18.0, 5.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000010', NULL, 'Luchi', 'STAPLE', 'EAST', 1, 'PIECES', 140, 2.5, 16.0, 7.5, TRUE, FALSE, NOW(), NOW()),

-- Indian meals / plates
    ('a1000001-0001-4000-8000-000000000021', NULL, 'Paneer bhurji', 'MEAL', 'NORTH', 1, 'SERVINGS', 280, 18.0, 8.0, 20.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000022', NULL, 'Chicken curry', 'MEAL', 'PAN_INDIA', 1, 'SERVINGS', 320, 28.0, 10.0, 18.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000023', NULL, 'Chicken tikka', 'MEAL', 'NORTH', 150, 'GRAMS', 250, 35.0, 4.0, 10.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000024', NULL, 'Egg curry', 'MEAL', 'PAN_INDIA', 1, 'SERVINGS', 280, 16.0, 8.0, 20.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000025', NULL, 'Rajma chawal', 'MEAL', 'NORTH', 1, 'SERVINGS', 450, 16.0, 70.0, 8.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000026', NULL, 'Dal chawal', 'MEAL', 'PAN_INDIA', 1, 'SERVINGS', 400, 14.0, 65.0, 6.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000027', NULL, 'Khichdi', 'MEAL', 'PAN_INDIA', 1, 'SERVINGS', 350, 12.0, 55.0, 8.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000028', NULL, 'Masala dosa', 'MEAL', 'SOUTH', 1, 'PIECES', 280, 6.0, 42.0, 9.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-000000000029', NULL, 'Butter chicken', 'MEAL', 'NORTH', 1, 'SERVINGS', 420, 30.0, 12.0, 28.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-00000000002a', NULL, 'Fish curry', 'MEAL', 'EAST', 1, 'SERVINGS', 300, 26.0, 8.0, 16.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-00000000002b', NULL, 'Misal pav', 'MEAL', 'WEST', 1, 'SERVINGS', 380, 14.0, 48.0, 14.0, TRUE, FALSE, NOW(), NOW()),
    ('a1000001-0001-4000-8000-00000000002c', NULL, 'Poha jalebi', 'MEAL', 'CENTRAL', 1, 'SERVINGS', 420, 6.0, 68.0, 14.0, TRUE, FALSE, NOW(), NOW());
