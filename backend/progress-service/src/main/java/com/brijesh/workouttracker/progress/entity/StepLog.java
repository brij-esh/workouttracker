package com.brijesh.workouttracker.progress.entity;

import com.brijesh.workouttracker.progress.domain.StepSource;
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
@Table(name = "step_logs")
@Getter
@Setter
@NoArgsConstructor
public class StepLog {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, length = 128, updatable = false)
    private String userId;

    @Column(name = "recorded_on", nullable = false)
    private LocalDate recordedOn;

    @Column(nullable = false)
    private int steps;

    @Column(name = "calories_burned", nullable = false)
    private int caloriesBurned;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StepSource source;

    @Column(name = "source_label", length = 80)
    private String sourceLabel;

    @Column(name = "weight_kg", precision = 6, scale = 2)
    private BigDecimal weightKg;

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
