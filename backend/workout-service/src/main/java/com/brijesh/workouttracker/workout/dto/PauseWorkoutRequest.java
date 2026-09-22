package com.brijesh.workouttracker.workout.dto;

import jakarta.validation.constraints.Min;

public record PauseWorkoutRequest(
        @Min(0) Long elapsedMs
) {
}
