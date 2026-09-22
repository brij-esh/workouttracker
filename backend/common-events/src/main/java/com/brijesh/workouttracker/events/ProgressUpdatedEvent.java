package com.brijesh.workouttracker.events;

import java.time.Instant;
import java.util.UUID;

public record ProgressUpdatedEvent(
        ProgressEventType eventType,
        UUID resourceId,
        String userId,
        String summary,
        Instant occurredAt
) {
}
