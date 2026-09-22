package com.brijesh.workouttracker.progress.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record WeightLogRequest(

        @NotNull(message = "Recorded date is required")
        LocalDate recordedOn,

        @NotNull(message = "Weight is required")
        @DecimalMin(value = "0.01", message = "Weight must be greater than zero")
        BigDecimal weightKg,

        @Size(max = 500, message = "Notes must not exceed 500 characters")
        String notes
) {
}
