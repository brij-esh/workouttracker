package com.brijesh.workouttracker.workout.dto;

import com.brijesh.workouttracker.workout.entity.Workout;
import com.brijesh.workouttracker.workout.entity.WorkoutStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record WorkoutResponse(
        UUID id,
        String userId,
        String name,
        String description,
        LocalDate workoutDate,
        Integer durationMinutes,
        Integer caloriesBurned,
        WorkoutStatus status,
        Instant sessionStartedAt,
        Instant pausedAt,
        Instant completedAt,
        Long elapsedMs,
        boolean archived,
        Instant createdAt,
        Instant updatedAt
) {

    public static WorkoutResponse fromEntity(Workout workout) {
        return new WorkoutResponse(
                workout.getId(),
                workout.getUserId(),
                workout.getName(),
                workout.getDescription(),
                workout.getWorkoutDate(),
                workout.getDurationMinutes(),
                workout.getCaloriesBurned(),
                workout.getStatus() != null ? workout.getStatus() : WorkoutStatus.COMPLETED,
                workout.getSessionStartedAt(),
                workout.getPausedAt(),
                workout.getCompletedAt(),
                workout.getElapsedMs(),
                workout.isArchived(),
                workout.getCreatedAt(),
                workout.getUpdatedAt()
        );
    }
}
