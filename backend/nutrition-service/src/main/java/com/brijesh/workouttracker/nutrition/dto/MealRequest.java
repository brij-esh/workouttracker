package com.brijesh.workouttracker.nutrition.dto;

import com.brijesh.workouttracker.nutrition.domain.FoodQuantityUnit;
import com.brijesh.workouttracker.nutrition.domain.MealType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MealRequest(

        @NotNull(message = "Meal date is required")
        LocalDate mealDate,

        @NotNull(message = "Meal type is required")
        MealType mealType,

        @NotBlank(message = "Meal name is required")
        @Size(max = 150, message = "Meal name must not exceed 150 characters")
        String name,

        @NotNull(message = "Quantity is required")
        @DecimalMin(value = "0.01", message = "Quantity must be greater than zero")
        BigDecimal quantity,

        @NotNull(message = "Quantity unit is required")
        FoodQuantityUnit quantityUnit,

        @NotNull(message = "Calories are required")
        @Min(value = 0, message = "Calories cannot be negative")
        Integer calories,

        @DecimalMin(value = "0.0", message = "Protein cannot be negative")
        BigDecimal proteinG,

        @DecimalMin(value = "0.0", message = "Carbs cannot be negative")
        BigDecimal carbsG,

        @DecimalMin(value = "0.0", message = "Fat cannot be negative")
        BigDecimal fatG,

        @Size(max = 500, message = "Notes must not exceed 500 characters")
        String notes
) {
}
