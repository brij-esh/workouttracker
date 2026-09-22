package com.brijesh.workouttracker.progress.entity;

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
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "body_measurements")
@Getter
@Setter
@NoArgsConstructor
public class BodyMeasurement {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, length = 128, updatable = false)
    private String userId;

    @Column(name = "recorded_on", nullable = false)
    private LocalDate recordedOn;

    @Column(name = "chest_cm", precision = 6, scale = 2)
    private BigDecimal chestCm;

    @Column(name = "waist_cm", precision = 6, scale = 2)
    private BigDecimal waistCm;

    @Column(name = "hips_cm", precision = 6, scale = 2)
    private BigDecimal hipsCm;

    @Column(name = "left_arm_cm", precision = 6, scale = 2)
    private BigDecimal leftArmCm;

    @Column(name = "right_arm_cm", precision = 6, scale = 2)
    private BigDecimal rightArmCm;

    @Column(name = "left_thigh_cm", precision = 6, scale = 2)
    private BigDecimal leftThighCm;

    @Column(name = "right_thigh_cm", precision = 6, scale = 2)
    private BigDecimal rightThighCm;

    @Column(name = "neck_cm", precision = 6, scale = 2)
    private BigDecimal neckCm;

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
