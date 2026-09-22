package com.brijesh.workouttracker.workout.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateWorkoutRequest(

        @NotBlank(message = "Workout name is required")
        @Size(max = 150, message = "Workout name must not exceed 150 characters")
        String name,

        @Size(max = 1000, message = "Description must not exceed 1000 characters")
        String description,

        @NotNull(message = "Workout date is required")
        LocalDate workoutDate,

        @Min(value = 1, message = "Duration must be greater than zero")
        Integer durationMinutes,

        @Min(value = 0, message = "Calories burned cannot be negative")
        Integer caloriesBurned,

        /** When true, workout starts as an in-progress live session. */
        Boolean liveSession
) {
}
