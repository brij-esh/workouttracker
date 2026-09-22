package com.brijesh.workouttracker.workout.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record UpdateWorkoutRequest(

        @NotBlank(message = "Workout name is required")
        String name,

        String description,

        @NotNull(message = "Workout date is required")
        LocalDate workoutDate,

        @Min(value = 1, message = "Duration must be greater than zero")
        Integer durationMinutes,

        @Min(value = 0, message = "Calories burned cannot be negative")
        Integer caloriesBurned
) {
}