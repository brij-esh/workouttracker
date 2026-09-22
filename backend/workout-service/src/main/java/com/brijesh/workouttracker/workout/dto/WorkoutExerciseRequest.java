package com.brijesh.workouttracker.workout.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record WorkoutExerciseRequest(

        @NotBlank(message = "Exercise name is required")
        @Size(max = 150, message = "Exercise name must not exceed 150 characters")
        String name,

        @Min(value = 1, message = "Sets must be at least 1")
        Integer sets,

        @Min(value = 1, message = "Reps must be at least 1")
        Integer reps,

        @DecimalMin(value = "0.0", inclusive = true, message = "Weight cannot be negative")
        BigDecimal weightKg,

        @DecimalMin(value = "0.0", inclusive = true, message = "1RM cannot be negative")
        BigDecimal oneRmKg,

        @DecimalMin(value = "0.0", inclusive = true, message = "Max weight cannot be negative")
        BigDecimal maxWeightKg,

        @Min(value = 1, message = "Max reps must be at least 1")
        Integer maxReps,

        @Size(max = 500, message = "Notes must not exceed 500 characters")
        String notes,

        @Min(value = 0, message = "Sort order cannot be negative")
        Integer sortOrder
) {
}
