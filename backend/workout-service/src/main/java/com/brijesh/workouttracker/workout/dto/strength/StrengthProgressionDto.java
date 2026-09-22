package com.brijesh.workouttracker.workout.dto.strength;

import java.math.BigDecimal;
import java.util.List;

public record StrengthProgressionDto(
        List<BigDecimal> weightKg,
        List<Integer> reps,
        List<BigDecimal> volumeKg,
        StrengthProgressionInsightDto insight
) {
}
