package com.brijesh.workouttracker.nutrition.entity;

import com.brijesh.workouttracker.nutrition.domain.NutritionGoal;
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
import java.util.UUID;

@Entity
@Table(name = "nutrition_targets")
@Getter
@Setter
@NoArgsConstructor
public class NutritionTarget {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, length = 128, unique = true, updatable = false)
    private String userId;

    @Column(name = "calorie_target", nullable = false)
    private Integer calorieTarget;

    @Column(name = "protein_g_target", nullable = false, precision = 7, scale = 2)
    private BigDecimal proteinGTarget;

    @Column(name = "carbs_g_target", nullable = false, precision = 7, scale = 2)
    private BigDecimal carbsGTarget;

    @Column(name = "fat_g_target", nullable = false, precision = 7, scale = 2)
    private BigDecimal fatGTarget;

    @Column(name = "fiber_g_target", nullable = false, precision = 7, scale = 2)
    private BigDecimal fiberGTarget = BigDecimal.valueOf(30);

    @Column(name = "water_ml_target", nullable = false)
    private Integer waterMlTarget;

    @Enumerated(EnumType.STRING)
    @Column(name = "nutrition_goal", nullable = false, length = 20)
    private NutritionGoal nutritionGoal = NutritionGoal.MAINTENANCE;

    @Column(name = "manual_override", nullable = false)
    private boolean manualOverride = false;

    @Column(name = "water_reminders_enabled", nullable = false)
    private boolean waterRemindersEnabled = false;

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
        if (fiberGTarget == null) {
            fiberGTarget = BigDecimal.valueOf(30);
        }
        if (nutritionGoal == null) {
            nutritionGoal = NutritionGoal.MAINTENANCE;
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = Instant.now();
    }
}
