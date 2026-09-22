package com.brijesh.workouttracker.events;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record WorkoutLifecycleEvent(
        WorkoutEventType eventType,
        UUID workoutId,
        String userId,
        String name,
        LocalDate workoutDate,
        Integer durationMinutes,
        Integer caloriesBurned,
        Instant occurredAt
) {
}
