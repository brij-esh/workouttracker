package com.brijesh.workouttracker.progress.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BodyWeightProgressResponse(
        BigDecimal dailyWeightKg,
        LocalDate dailyWeightOn,
        BigDecimal weeklyAverageKg,
        BigDecimal monthlyAverageKg,
        BigDecimal startingWeightKg,
        LocalDate startingWeightOn,
        BigDecimal currentWeightKg,
        BigDecimal weightChangeKg,
        BigDecimal rateOfChangeKgPerWeek,
        BigDecimal goalWeightKg,
        BigDecimal progressPct,
        String note
) {
}
