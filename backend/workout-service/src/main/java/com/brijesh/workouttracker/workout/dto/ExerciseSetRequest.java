package com.brijesh.workouttracker.workout.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ExerciseSetRequest(

        @Min(value = 1, message = "Set number must be at least 1")
        Integer setNumber,

        @Min(value = 1, message = "Reps must be at least 1")
        Integer reps,

        @DecimalMin(value = "0.0", inclusive = true, message = "Weight cannot be negative")
        BigDecimal weightKg,

        Boolean completed,

        @Min(value = 0, message = "Rest seconds cannot be negative")
        Integer restSeconds,

        @Size(max = 500, message = "Notes must not exceed 500 characters")
        String notes
) {
}
