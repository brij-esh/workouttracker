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
@Table(name = "exercise_sets")
@Getter
@Setter
@NoArgsConstructor
public class ExerciseSet {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "exercise_id", nullable = false, updatable = false)
    private UUID exerciseId;

    @Column(name = "workout_id", nullable = false, updatable = false)
    private UUID workoutId;

    @Column(name = "user_id", nullable = false, length = 128, updatable = false)
    private String userId;

    @Column(name = "set_number", nullable = false)
    private Integer setNumber;

    @Column
    private Integer reps;

    @Column(name = "weight_kg", precision = 10, scale = 2)
    private BigDecimal weightKg;

    @Column(nullable = false)
    private boolean completed = false;

    @Column(name = "rest_seconds")
    private Integer restSeconds;

    @Column(length = 500)
    private String notes;

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
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = Instant.now();
    }
}
