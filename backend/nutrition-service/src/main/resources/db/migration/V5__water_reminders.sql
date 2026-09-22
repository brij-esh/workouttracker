ALTER TABLE nutrition_targets
    ADD COLUMN IF NOT EXISTS water_reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE;
