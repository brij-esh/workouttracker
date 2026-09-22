package com.brijesh.workouttracker.progress.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProgressSummaryResponse(
        long weightLogCount,
        long bodyMeasurementCount,
        long personalRecordCount,
        BigDecimal latestWeightKg,
        LocalDate latestWeightOn,
        BigDecimal startingWeightKg,
        LocalDate startingWeightOn,
        BigDecimal weightChangeKg
) {
}
