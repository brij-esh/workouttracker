package com.brijesh.workouttracker.nutrition.dto;

import com.brijesh.workouttracker.nutrition.domain.NutritionGoal;
import com.brijesh.workouttracker.nutrition.entity.NutritionTarget;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record NutritionTargetResponse(
        UUID id,
        String userId,
        Integer calorieTarget,
        BigDecimal proteinGTarget,
        BigDecimal carbsGTarget,
        BigDecimal fatGTarget,
        BigDecimal fiberGTarget,
        Integer waterMlTarget,
        NutritionGoal nutritionGoal,
        boolean manualOverride,
        boolean waterRemindersEnabled,
        Instant createdAt,
        Instant updatedAt
) {

    public static NutritionTargetResponse fromEntity(NutritionTarget target) {
        return new NutritionTargetResponse(
                target.getId(),
                target.getUserId(),
                target.getCalorieTarget(),
                target.getProteinGTarget(),
                target.getCarbsGTarget(),
                target.getFatGTarget(),
                target.getFiberGTarget(),
                target.getWaterMlTarget(),
                target.getNutritionGoal(),
                target.isManualOverride(),
                target.isWaterRemindersEnabled(),
                target.getCreatedAt(),
                target.getUpdatedAt()
        );
    }
}
