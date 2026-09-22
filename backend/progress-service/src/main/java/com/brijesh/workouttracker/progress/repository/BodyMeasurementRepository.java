package com.brijesh.workouttracker.progress.repository;

import com.brijesh.workouttracker.progress.entity.BodyMeasurement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BodyMeasurementRepository extends JpaRepository<BodyMeasurement, UUID> {

    List<BodyMeasurement> findAllByUserIdOrderByRecordedOnDesc(String userId);

    Optional<BodyMeasurement> findByIdAndUserId(UUID id, String userId);

    Optional<BodyMeasurement> findFirstByUserIdOrderByRecordedOnDesc(String userId);

    long countByUserId(String userId);
}
