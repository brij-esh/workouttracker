package com.brijesh.workouttracker.nutrition.dto;

import com.brijesh.workouttracker.nutrition.domain.FoodCategory;
import com.brijesh.workouttracker.nutrition.domain.FoodQuantityUnit;
import com.brijesh.workouttracker.nutrition.domain.FoodRegion;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record FoodItemRequest(

        @NotBlank(message = "Food name is required")
        @Size(max = 150, message = "Food name must not exceed 150 characters")
        String name,

        FoodCategory category,

        FoodRegion region,

        @NotNull(message = "Serving quantity is required")
        @DecimalMin(value = "0.01", message = "Serving quantity must be greater than zero")
        BigDecimal servingQty,

        @NotNull(message = "Serving unit is required")
        FoodQuantityUnit servingUnit,

        @NotNull(message = "Calories are required")
        @Min(value = 0, message = "Calories cannot be negative")
        Integer calories,

        @DecimalMin(value = "0.0", message = "Protein cannot be negative")
        BigDecimal proteinG,

        @DecimalMin(value = "0.0", message = "Carbs cannot be negative")
        BigDecimal carbsG,

        @DecimalMin(value = "0.0", message = "Fat cannot be negative")
        BigDecimal fatG
) {
}
