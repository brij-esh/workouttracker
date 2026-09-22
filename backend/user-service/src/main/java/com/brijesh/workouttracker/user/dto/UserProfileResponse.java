package com.brijesh.workouttracker.user.dto;

import com.brijesh.workouttracker.user.domain.ActivityLevel;
import com.brijesh.workouttracker.user.domain.FitnessGoal;
import com.brijesh.workouttracker.user.domain.Gender;
import com.brijesh.workouttracker.user.domain.PreferredUnits;
import com.brijesh.workouttracker.user.entity.UserProfile;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String firebaseUid,
        String email,
        String displayName,
        BigDecimal heightCm,
        BigDecimal weightKg,
        LocalDate dateOfBirth,
        Gender gender,
        FitnessGoal fitnessGoal,
        ActivityLevel activityLevel,
        PreferredUnits preferredUnits,
        String timezone,
        String region,
        boolean onboardingCompleted,
        Instant createdAt,
        Instant updatedAt
) {

    public static UserProfileResponse fromEntity(UserProfile profile) {
        return new UserProfileResponse(
                profile.getId(),
                profile.getFirebaseUid(),
                profile.getEmail(),
                profile.getDisplayName(),
                profile.getHeightCm(),
                profile.getWeightKg(),
                profile.getDateOfBirth(),
                profile.getGender(),
                profile.getFitnessGoal(),
                profile.getActivityLevel(),
                profile.getPreferredUnits(),
                profile.getTimezone(),
                profile.getRegion(),
                profile.isOnboardingCompleted(),
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }
}
