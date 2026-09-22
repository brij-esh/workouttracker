package com.brijesh.workouttracker.workout.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "workout_exercises")
@Getter
@Setter
@NoArgsConstructor
public class WorkoutExercise {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "workout_id", nullable = false, updatable = false)
    private UUID workoutId;

    @Column(name = "user_id", nullable = false, length = 128, updatable = false)
    private String userId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column
    private Integer sets;

    @Column
    private Integer reps;

    @Column(name = "weight_kg", precision = 10, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "one_rm_kg", precision = 10, scale = 2)
    private BigDecimal oneRmKg;

    @Column(name = "max_weight_kg", precision = 10, scale = 2)
    private BigDecimal maxWeightKg;

    @Column(name = "max_reps")
    private Integer maxReps;

    @Column(length = 500)
    private String notes;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(nullable = false)
    private boolean archived = false;

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
        if (sortOrder == null) {
            sortOrder = 0;
        }
        archived = false;
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = Instant.now();
    }
}
