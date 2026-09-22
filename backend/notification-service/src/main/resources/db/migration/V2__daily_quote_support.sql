-- Allow motivational quote notifications
ALTER TABLE notifications DROP CONSTRAINT chk_notifications_type;
ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_type
        CHECK (type IN (
            'WORKOUT_REMINDER',
            'PROGRESS_UPDATE',
            'NUTRITION_REMINDER',
            'SYSTEM',
            'GENERAL',
            'MOTIVATIONAL_QUOTE'
        ));

-- Track users who should receive scheduled notifications
CREATE TABLE notification_recipients (
    user_id VARCHAR(128) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_notifications_user_reference
    ON notifications (user_id, reference_id);
