package com.brijesh.workouttracker.nutrition.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DailyNutritionSummaryResponse(
        LocalDate date,
        int totalCalories,
        BigDecimal totalProteinG,
        BigDecimal totalCarbsG,
        BigDecimal totalFatG,
        int totalWaterMl,
        NutritionTargetResponse targets,
        Integer remainingCalories,
        BigDecimal remainingProteinG,
        BigDecimal remainingCarbsG,
        BigDecimal remainingFatG,
        Integer remainingWaterMl,
        List<MealResponse> meals
) {
}
