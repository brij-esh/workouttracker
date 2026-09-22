package com.brijesh.workouttracker.workout.dto.strength;

import java.math.BigDecimal;

public record StrengthProgressionInsightDto(
        boolean detected,
        String metric,
        BigDecimal changePct,
        Integer windowWeeks,
        String message
) {
}
