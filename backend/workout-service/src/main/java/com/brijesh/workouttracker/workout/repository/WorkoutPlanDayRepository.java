package com.brijesh.workouttracker.workout.repository;

import com.brijesh.workouttracker.workout.entity.WorkoutPlanDay;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkoutPlanDayRepository extends JpaRepository<WorkoutPlanDay, UUID> {

    List<WorkoutPlanDay> findAllByPlanIdOrderBySortOrderAsc(UUID planId);

    Optional<WorkoutPlanDay> findByIdAndPlanId(UUID id, UUID planId);

    void deleteAllByPlanId(UUID planId);
}
