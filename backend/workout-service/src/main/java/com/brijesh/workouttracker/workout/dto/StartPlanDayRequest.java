package com.brijesh.workouttracker.workout.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public record StartPlanDayRequest(

        @NotNull(message = "Plan day id is required")
        UUID planDayId,

        LocalDate workoutDate
) {
}
