package com.brijesh.workouttracker.workout.dto;

import com.brijesh.workouttracker.workout.domain.EquipmentType;
import com.brijesh.workouttracker.workout.domain.ExerciseDifficulty;
import com.brijesh.workouttracker.workout.domain.MuscleGroup;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record LibraryExerciseRequest(

        @NotBlank(message = "Exercise name is required")
        @Size(max = 150, message = "Exercise name must not exceed 150 characters")
        String name,

        @NotNull(message = "Muscle group is required")
        MuscleGroup muscleGroup,

        EquipmentType equipment,

        @Size(max = 5000, message = "Instructions must not exceed 5000 characters")
        String instructions,

        ExerciseDifficulty difficulty
) {
}
