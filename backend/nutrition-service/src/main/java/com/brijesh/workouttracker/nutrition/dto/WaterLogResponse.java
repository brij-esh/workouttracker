package com.brijesh.workouttracker.nutrition.dto;

import com.brijesh.workouttracker.nutrition.entity.WaterLog;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record WaterLogResponse(
        UUID id,
        String userId,
        LocalDate loggedOn,
        Integer amountMl,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {

    public static WaterLogResponse fromEntity(WaterLog log) {
        return new WaterLogResponse(
                log.getId(),
                log.getUserId(),
                log.getLoggedOn(),
                log.getAmountMl(),
                log.getNotes(),
                log.getCreatedAt(),
                log.getUpdatedAt()
        );
    }
}
