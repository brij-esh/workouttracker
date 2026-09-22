package com.brijesh.workouttracker.progress.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BodyMeasurementRequest(

        @NotNull(message = "Recorded date is required")
        LocalDate recordedOn,

        @DecimalMin(value = "0.01", message = "Chest must be greater than zero")
        BigDecimal chestCm,

        @DecimalMin(value = "0.01", message = "Waist must be greater than zero")
        BigDecimal waistCm,

        @DecimalMin(value = "0.01", message = "Hips must be greater than zero")
        BigDecimal hipsCm,

        @DecimalMin(value = "0.01", message = "Left arm must be greater than zero")
        BigDecimal leftArmCm,

        @DecimalMin(value = "0.01", message = "Right arm must be greater than zero")
        BigDecimal rightArmCm,

        @DecimalMin(value = "0.01", message = "Left thigh must be greater than zero")
        BigDecimal leftThighCm,

        @DecimalMin(value = "0.01", message = "Right thigh must be greater than zero")
        BigDecimal rightThighCm,

        @DecimalMin(value = "0.01", message = "Neck must be greater than zero")
        BigDecimal neckCm,

        @Size(max = 500, message = "Notes must not exceed 500 characters")
        String notes
) {
}
