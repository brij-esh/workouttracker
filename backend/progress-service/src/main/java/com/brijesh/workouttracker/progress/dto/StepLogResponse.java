package com.brijesh.workouttracker.progress.dto;

import com.brijesh.workouttracker.progress.domain.StepSource;
import com.brijesh.workouttracker.progress.entity.StepLog;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record StepLogResponse(
        UUID id,
        String userId,
        LocalDate recordedOn,
        int steps,
        int caloriesBurned,
        StepSource source,
        String sourceLabel,
        BigDecimal weightKg,
        Instant createdAt,
        Instant updatedAt
) {

    public static StepLogResponse fromEntity(StepLog entity) {
        return new StepLogResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getRecordedOn(),
                entity.getSteps(),
                entity.getCaloriesBurned(),
                entity.getSource(),
                entity.getSourceLabel(),
                entity.getWeightKg(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
