package com.brijesh.workouttracker.workout.dto.strength;

import java.math.BigDecimal;

public record StrengthBestSetDto(
        BigDecimal weightKg,
        Integer reps,
        BigDecimal estimatedOneRmKg
) {
}
