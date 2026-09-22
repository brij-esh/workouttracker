package com.brijesh.workouttracker.workout.repository;

import com.brijesh.workouttracker.workout.entity.WorkoutPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkoutPlanRepository extends JpaRepository<WorkoutPlan, UUID> {

    List<WorkoutPlan> findAllByUserIdAndArchivedFalseOrderByUpdatedAtDesc(String userId);

    Optional<WorkoutPlan> findByIdAndUserId(UUID id, String userId);

    boolean existsByIdAndUserIdAndArchivedFalse(UUID id, String userId);
}
