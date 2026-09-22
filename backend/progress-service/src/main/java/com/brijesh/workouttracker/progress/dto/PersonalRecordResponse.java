package com.brijesh.workouttracker.progress.dto;

import com.brijesh.workouttracker.progress.domain.RecordType;
import com.brijesh.workouttracker.progress.entity.PersonalRecord;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record PersonalRecordResponse(
        UUID id,
        String userId,
        String exerciseName,
        RecordType recordType,
        BigDecimal value,
        LocalDate recordedOn,
        String notes,
        boolean archived,
        Instant createdAt,
        Instant updatedAt
) {

    public static PersonalRecordResponse fromEntity(PersonalRecord entity) {
        return new PersonalRecordResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getExerciseName(),
                entity.getRecordType(),
                entity.getValue(),
                entity.getRecordedOn(),
                entity.getNotes(),
                entity.isArchived(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
