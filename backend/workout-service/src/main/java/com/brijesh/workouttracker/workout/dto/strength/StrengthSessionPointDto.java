package com.brijesh.workouttracker.workout.dto.strength;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record StrengthSessionPointDto(
        LocalDate date,
        UUID workoutId,
        BigDecimal estimatedOneRmKg,
        BigDecimal maxWeightKg,
        BigDecimal volumeKg,
        Integer bestReps
) {
}
