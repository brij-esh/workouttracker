package com.brijesh.workouttracker.progress.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record WeightGoalRequest(
        @NotNull
        @DecimalMin("20.0")
        BigDecimal goalWeightKg
) {
}
