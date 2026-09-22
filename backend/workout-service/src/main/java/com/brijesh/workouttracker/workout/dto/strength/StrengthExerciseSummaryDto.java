package com.brijesh.workouttracker.workout.dto.strength;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StrengthExerciseSummaryDto(
        String exerciseKey,
        String exerciseName,
        BigDecimal currentOneRmKg,
        BigDecimal previousOneRmKg,
        BigDecimal oneRmProgressPct,
        StrengthBestSetDto bestSet,
        BigDecimal volumeThisMonthKg,
        BigDecimal totalVolumeKg,
        BigDecimal maxWeightKg,
        BigDecimal averageWorkingWeightKg,
        Integer bestRepsAtMaxWeight,
        Integer weightPrCount,
        Integer repsPrCount,
        Integer volumePrCount,
        Integer sessions,
        LocalDate lastPerformed,
        StrengthProgressionInsightDto progressionInsight
) {
}
