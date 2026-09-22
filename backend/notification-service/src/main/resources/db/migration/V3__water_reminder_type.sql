-- Allow water reminder notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notifications_type;
ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_type
        CHECK (type IN (
            'WORKOUT_REMINDER',
            'PROGRESS_UPDATE',
            'NUTRITION_REMINDER',
            'WATER_REMINDER',
            'SYSTEM',
            'GENERAL',
            'MOTIVATIONAL_QUOTE'
        ));
