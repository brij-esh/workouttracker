package com.brijesh.workouttracker.events;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record NutritionLoggedEvent(
        NutritionEventType eventType,
        UUID resourceId,
        String userId,
        LocalDate date,
        String summary,
        Instant occurredAt,
        String referenceId
) {
}
