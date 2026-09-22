package com.brijesh.workouttracker.progress.dto;

import com.brijesh.workouttracker.progress.domain.StepSource;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StepLogRequest(

        @NotNull(message = "Recorded date is required")
        LocalDate recordedOn,

        @NotNull(message = "Steps are required")
        @Min(value = 0, message = "Steps cannot be negative")
        @Max(value = 200000, message = "Steps look unrealistically high")
        Integer steps,

        StepSource source,

        @Size(max = 80, message = "Source label must not exceed 80 characters")
        String sourceLabel,

        BigDecimal weightKg
) {
}
