package com.brijesh.workouttracker.progress.repository;

import com.brijesh.workouttracker.progress.entity.PersonalRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PersonalRecordRepository extends JpaRepository<PersonalRecord, UUID> {

    List<PersonalRecord> findAllByUserIdAndArchivedFalseOrderByRecordedOnDesc(String userId);

    List<PersonalRecord> findAllByUserIdAndArchivedTrueOrderByRecordedOnDesc(String userId);

    Optional<PersonalRecord> findByIdAndUserId(UUID id, String userId);

    long countByUserIdAndArchivedFalse(String userId);
}
