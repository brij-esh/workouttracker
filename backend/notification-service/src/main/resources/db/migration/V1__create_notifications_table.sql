CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    reference_id VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_notifications_type
        CHECK (type IN (
            'WORKOUT_REMINDER',
            'PROGRESS_UPDATE',
            'NUTRITION_REMINDER',
            'SYSTEM',
            'GENERAL'
        ))
);

CREATE INDEX idx_notifications_user_created
    ON notifications (user_id, created_at DESC);

CREATE INDEX idx_notifications_user_unread
    ON notifications (user_id, read)
    WHERE read = FALSE;
