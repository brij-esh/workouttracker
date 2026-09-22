package com.brijesh.workouttracker.progress.repository;

import com.brijesh.workouttracker.progress.entity.StepLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StepLogRepository extends JpaRepository<StepLog, UUID> {

    Optional<StepLog> findByUserIdAndRecordedOn(String userId, LocalDate recordedOn);

    Optional<StepLog> findByIdAndUserId(UUID id, String userId);

    List<StepLog> findAllByUserIdAndRecordedOnBetweenOrderByRecordedOnDesc(
            String userId,
            LocalDate from,
            LocalDate to
    );

    List<StepLog> findAllByUserIdOrderByRecordedOnDesc(String userId);
}
