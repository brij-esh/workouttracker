package com.brijesh.workouttracker.nutrition.dto;

import com.brijesh.workouttracker.nutrition.domain.NutritionGoal;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record NutritionTargetRequest(

        @NotNull(message = "Calorie target is required")
        @Min(value = 1, message = "Calorie target must be greater than zero")
        Integer calorieTarget,

        @NotNull(message = "Protein target is required")
        @DecimalMin(value = "0.0", message = "Protein target cannot be negative")
        BigDecimal proteinGTarget,

        @NotNull(message = "Carbs target is required")
        @DecimalMin(value = "0.0", message = "Carbs target cannot be negative")
        BigDecimal carbsGTarget,

        @NotNull(message = "Fat target is required")
        @DecimalMin(value = "0.0", message = "Fat target cannot be negative")
        BigDecimal fatGTarget,

        @NotNull(message = "Fiber target is required")
        @DecimalMin(value = "0.0", message = "Fiber target cannot be negative")
        BigDecimal fiberGTarget,

        @NotNull(message = "Water target is required")
        @Min(value = 1, message = "Water target must be greater than zero")
        Integer waterMlTarget,

        @NotNull(message = "Nutrition goal is required")
        NutritionGoal nutritionGoal,

        @NotNull(message = "manualOverride is required")
        Boolean manualOverride,

        Boolean waterRemindersEnabled
) {
}
