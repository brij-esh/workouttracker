package com.brijesh.workouttracker.workout.dto;

import com.brijesh.workouttracker.workout.entity.ExerciseSet;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ExerciseSetResponse(
        UUID id,
        UUID exerciseId,
        UUID workoutId,
        String userId,
        Integer setNumber,
        Integer reps,
        BigDecimal weightKg,
        boolean completed,
        Integer restSeconds,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {

    public static ExerciseSetResponse fromEntity(ExerciseSet set) {
        return new ExerciseSetResponse(
                set.getId(),
                set.getExerciseId(),
                set.getWorkoutId(),
                set.getUserId(),
                set.getSetNumber(),
                set.getReps(),
                set.getWeightKg(),
                set.isCompleted(),
                set.getRestSeconds(),
                set.getNotes(),
                set.getCreatedAt(),
                set.getUpdatedAt()
        );
    }
}
