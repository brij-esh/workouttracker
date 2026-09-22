package com.brijesh.workouttracker.progress.dto;

import com.brijesh.workouttracker.progress.entity.BodyMeasurement;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record BodyMeasurementResponse(
        UUID id,
        String userId,
        LocalDate recordedOn,
        BigDecimal chestCm,
        BigDecimal waistCm,
        BigDecimal hipsCm,
        BigDecimal leftArmCm,
        BigDecimal rightArmCm,
        BigDecimal leftThighCm,
        BigDecimal rightThighCm,
        BigDecimal neckCm,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {

    public static BodyMeasurementResponse fromEntity(BodyMeasurement entity) {
        return new BodyMeasurementResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getRecordedOn(),
                entity.getChestCm(),
                entity.getWaistCm(),
                entity.getHipsCm(),
                entity.getLeftArmCm(),
                entity.getRightArmCm(),
                entity.getLeftThighCm(),
                entity.getRightThighCm(),
                entity.getNeckCm(),
                entity.getNotes(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
