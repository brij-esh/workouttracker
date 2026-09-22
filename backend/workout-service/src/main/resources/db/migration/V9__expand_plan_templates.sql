-- Expand seedable workout plan templates
ALTER TABLE workout_plans DROP CONSTRAINT IF EXISTS chk_workout_plans_type;

ALTER TABLE workout_plans
    ADD CONSTRAINT chk_workout_plans_type
        CHECK (template_type IN (
            'PPL',
            'UPPER_LOWER',
            'FULL_BODY',
            'BRO_SPLIT',
            'ARNOLD',
            'STRENGTH',
            'CUSTOM'
        ));
