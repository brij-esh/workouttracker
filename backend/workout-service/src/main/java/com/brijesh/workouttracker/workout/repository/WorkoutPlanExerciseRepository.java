package com.brijesh.workouttracker.workout.repository;

import com.brijesh.workouttracker.workout.entity.WorkoutPlanExercise;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkoutPlanExerciseRepository extends JpaRepository<WorkoutPlanExercise, UUID> {

    List<WorkoutPlanExercise> findAllByPlanDayIdOrderBySortOrderAsc(UUID planDayId);

    List<WorkoutPlanExercise> findAllByPlanDayIdInOrderBySortOrderAsc(List<UUID> planDayIds);

    Optional<WorkoutPlanExercise> findByIdAndPlanDayId(UUID id, UUID planDayId);

    void deleteAllByPlanDayId(UUID planDayId);

    void deleteAllByPlanDayIdIn(List<UUID> planDayIds);
}
