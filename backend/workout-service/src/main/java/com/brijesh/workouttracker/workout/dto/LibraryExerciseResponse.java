package com.brijesh.workouttracker.workout.dto;

import com.brijesh.workouttracker.workout.domain.EquipmentType;
import com.brijesh.workouttracker.workout.domain.ExerciseDifficulty;
import com.brijesh.workouttracker.workout.domain.MuscleGroup;
import com.brijesh.workouttracker.workout.entity.LibraryExercise;

import java.time.Instant;
import java.util.UUID;

public record LibraryExerciseResponse(
        UUID id,
        String userId,
        String name,
        MuscleGroup muscleGroup,
        EquipmentType equipment,
        String instructions,
        ExerciseDifficulty difficulty,
        boolean custom,
        Instant createdAt,
        Instant updatedAt
) {

    public static LibraryExerciseResponse fromEntity(LibraryExercise exercise) {
        return new LibraryExerciseResponse(
                exercise.getId(),
                exercise.getUserId(),
                exercise.getName(),
                exercise.getMuscleGroup(),
                exercise.getEquipment(),
                exercise.getInstructions(),
                exercise.getDifficulty(),
                exercise.getUserId() != null,
                exercise.getCreatedAt(),
                exercise.getUpdatedAt()
        );
    }
}
