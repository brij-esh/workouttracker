package com.brijesh.workouttracker.events;

import java.time.Instant;
import java.util.UUID;

public record UserRegisteredEvent(
        UUID profileId,
        String firebaseUid,
        String email,
        String displayName,
        Instant occurredAt
) {
}
