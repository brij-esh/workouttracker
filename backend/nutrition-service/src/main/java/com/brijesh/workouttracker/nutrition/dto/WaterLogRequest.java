package com.brijesh.workouttracker.nutrition.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record WaterLogRequest(

        @NotNull(message = "Logged date is required")
        LocalDate loggedOn,

        @NotNull(message = "Amount is required")
        @Min(value = 1, message = "Amount must be greater than zero")
        Integer amountMl,

        @Size(max = 500, message = "Notes must not exceed 500 characters")
        String notes
) {
}
