package com.brijesh.workouttracker.workout.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateWorkoutPlanRequest(
        @NotBlank(message = "Plan name is required")
        @Size(max = 150, message = "Plan name must not exceed 150 characters")
        String name,

        @Size(max = 1000, message = "Description must not exceed 1000 characters")
        String description
) {
}
