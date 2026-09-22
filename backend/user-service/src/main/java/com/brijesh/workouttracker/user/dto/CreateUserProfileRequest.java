package com.brijesh.workouttracker.user.dto;

import com.brijesh.workouttracker.user.domain.ActivityLevel;
import com.brijesh.workouttracker.user.domain.FitnessGoal;
import com.brijesh.workouttracker.user.domain.Gender;
import com.brijesh.workouttracker.user.domain.PreferredUnits;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateUserProfileRequest(

        @NotBlank(message = "Display name is required")
        @Size(max = 150, message = "Display name must not exceed 150 characters")
        String displayName,

        @DecimalMin(value = "0.01", message = "Height must be greater than zero")
        BigDecimal heightCm,

        @DecimalMin(value = "0.01", message = "Weight must be greater than zero")
        BigDecimal weightKg,

        @Past(message = "Date of birth must be in the past")
        LocalDate dateOfBirth,

        Gender gender,

        FitnessGoal fitnessGoal,

        ActivityLevel activityLevel,

        PreferredUnits preferredUnits,

        @Size(max = 64, message = "Timezone must not exceed 64 characters")
        String timezone,

        @Size(max = 8, message = "Region must not exceed 8 characters")
        String region,

        Boolean onboardingCompleted
) {
}
