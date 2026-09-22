package com.brijesh.workouttracker.progress.dto;

import com.brijesh.workouttracker.progress.entity.WeightLog;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record WeightLogResponse(
        UUID id,
        String userId,
        LocalDate recordedOn,
        BigDecimal weightKg,
        String notes,
        boolean archived,
        Instant createdAt,
        Instant updatedAt
) {

    public static WeightLogResponse fromEntity(WeightLog entity) {
        return new WeightLogResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getRecordedOn(),
                entity.getWeightKg(),
                entity.getNotes(),
                entity.isArchived(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
