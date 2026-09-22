package com.brijesh.workouttracker.workout.dto;

import jakarta.validation.constraints.Min;

public record CompleteWorkoutRequest(
        @Min(value = 1, message = "Duration must be greater than zero")
        Integer durationMinutes,

        @Min(value = 0, message = "Calories burned cannot be negative")
        Integer caloriesBurned,

        @Min(0) Long elapsedMs
) {
}
