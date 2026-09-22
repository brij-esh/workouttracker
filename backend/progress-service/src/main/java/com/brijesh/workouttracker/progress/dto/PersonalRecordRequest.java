package com.brijesh.workouttracker.progress.dto;

import com.brijesh.workouttracker.progress.domain.RecordType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PersonalRecordRequest(

        @NotBlank(message = "Exercise name is required")
        @Size(max = 150, message = "Exercise name must not exceed 150 characters")
        String exerciseName,

        @NotNull(message = "Record type is required")
        RecordType recordType,

        @NotNull(message = "Value is required")
        @DecimalMin(value = "0.01", message = "Value must be greater than zero")
        BigDecimal value,

        @NotNull(message = "Recorded date is required")
        LocalDate recordedOn,

        @Size(max = 500, message = "Notes must not exceed 500 characters")
        String notes
) {
}
