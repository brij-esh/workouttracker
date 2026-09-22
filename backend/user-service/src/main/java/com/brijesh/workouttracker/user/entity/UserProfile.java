package com.brijesh.workouttracker.user.entity;

import com.brijesh.workouttracker.user.domain.ActivityLevel;
import com.brijesh.workouttracker.user.domain.FitnessGoal;
import com.brijesh.workouttracker.user.domain.Gender;
import com.brijesh.workouttracker.user.domain.PreferredUnits;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class UserProfile {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "firebase_uid", nullable = false, unique = true, length = 128, updatable = false)
    private String firebaseUid;

    @Column(length = 255)
    private String email;

    @Column(name = "display_name", nullable = false, length = 150)
    private String displayName;

    @Column(name = "height_cm", precision = 5, scale = 2)
    private BigDecimal heightCm;

    @Column(name = "weight_kg", precision = 5, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    @Column(name = "fitness_goal", length = 50)
    private FitnessGoal fitnessGoal;

    @Enumerated(EnumType.STRING)
    @Column(name = "activity_level", length = 50)
    private ActivityLevel activityLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_units", nullable = false, length = 20)
    private PreferredUnits preferredUnits = PreferredUnits.METRIC;

    @Column(length = 64)
    private String timezone;

    @Column(length = 8)
    private String region;

    @Column(name = "onboarding_completed", nullable = false)
    private boolean onboardingCompleted;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void onCreate() {
        Instant now = Instant.now();

        if (id == null) {
            id = UUID.randomUUID();
        }

        if (preferredUnits == null) {
            preferredUnits = PreferredUnits.METRIC;
        }

        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = Instant.now();
    }
}
