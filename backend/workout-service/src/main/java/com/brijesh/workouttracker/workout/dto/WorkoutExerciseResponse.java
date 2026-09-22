package com.brijesh.workouttracker.workout.dto;

import com.brijesh.workouttracker.workout.entity.WorkoutExercise;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WorkoutExerciseResponse(
        UUID id,
        UUID workoutId,
        String userId,
        String name,
        Integer sets,
        Integer reps,
        BigDecimal weightKg,
        BigDecimal oneRmKg,
        BigDecimal maxWeightKg,
        Integer maxReps,
        String notes,
        Integer sortOrder,
        boolean archived,
        Instant createdAt,
        Instant updatedAt
) {

    public static WorkoutExerciseResponse fromEntity(WorkoutExercise exercise) {
        return new WorkoutExerciseResponse(
                exercise.getId(),
                exercise.getWorkoutId(),
                exercise.getUserId(),
                exercise.getName(),
                exercise.getSets(),
                exercise.getReps(),
                exercise.getWeightKg(),
                exercise.getOneRmKg(),
                exercise.getMaxWeightKg(),
                exercise.getMaxReps(),
                exercise.getNotes(),
                exercise.getSortOrder(),
                exercise.isArchived(),
                exercise.getCreatedAt(),
                exercise.getUpdatedAt()
        );
    }
}
