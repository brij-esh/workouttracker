package com.brijesh.workouttracker.nutrition.dto;

import com.brijesh.workouttracker.nutrition.domain.FoodCategory;
import com.brijesh.workouttracker.nutrition.domain.FoodQuantityUnit;
import com.brijesh.workouttracker.nutrition.domain.FoodRegion;
import com.brijesh.workouttracker.nutrition.entity.FoodItem;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record FoodItemResponse(
        UUID id,
        String userId,
        String name,
        FoodCategory category,
        FoodRegion region,
        BigDecimal servingQty,
        FoodQuantityUnit servingUnit,
        Integer calories,
        BigDecimal proteinG,
        BigDecimal carbsG,
        BigDecimal fatG,
        boolean systemFood,
        Instant createdAt,
        Instant updatedAt
) {

    public static FoodItemResponse fromEntity(FoodItem food) {
        return new FoodItemResponse(
                food.getId(),
                food.getUserId(),
                food.getName(),
                food.getCategory(),
                food.getRegion(),
                food.getServingQty(),
                food.getServingUnit(),
                food.getCalories(),
                food.getProteinG(),
                food.getCarbsG(),
                food.getFatG(),
                food.isSystemFood(),
                food.getCreatedAt(),
                food.getUpdatedAt()
        );
    }
}
