package com.brijesh.workouttracker.progress.repository;

import com.brijesh.workouttracker.progress.entity.WeightLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WeightLogRepository extends JpaRepository<WeightLog, UUID> {

    List<WeightLog> findAllByUserIdAndArchivedFalseOrderByRecordedOnDesc(String userId);

    List<WeightLog> findAllByUserIdAndArchivedTrueOrderByRecordedOnDesc(String userId);

    Optional<WeightLog> findByIdAndUserId(UUID id, String userId);

    Optional<WeightLog> findFirstByUserIdAndArchivedFalseOrderByRecordedOnDesc(String userId);

    Optional<WeightLog> findFirstByUserIdAndArchivedFalseOrderByRecordedOnAsc(String userId);

    long countByUserIdAndArchivedFalse(String userId);
}
