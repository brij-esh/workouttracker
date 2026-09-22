package com.brijesh.workouttracker.nutrition.dto;

import com.brijesh.workouttracker.nutrition.domain.FoodQuantityUnit;
import com.brijesh.workouttracker.nutrition.domain.MealType;
import com.brijesh.workouttracker.nutrition.entity.Meal;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record MealResponse(
        UUID id,
        String userId,
        LocalDate mealDate,
        MealType mealType,
        String name,
        BigDecimal quantity,
        FoodQuantityUnit quantityUnit,
        Integer calories,
        BigDecimal proteinG,
        BigDecimal carbsG,
        BigDecimal fatG,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {

    public static MealResponse fromEntity(Meal meal) {
        return new MealResponse(
                meal.getId(),
                meal.getUserId(),
                meal.getMealDate(),
                meal.getMealType(),
                meal.getName(),
                meal.getQuantity(),
                meal.getQuantityUnit(),
                meal.getCalories(),
                meal.getProteinG(),
                meal.getCarbsG(),
                meal.getFatG(),
                meal.getNotes(),
                meal.getCreatedAt(),
                meal.getUpdatedAt()
        );
    }
}
