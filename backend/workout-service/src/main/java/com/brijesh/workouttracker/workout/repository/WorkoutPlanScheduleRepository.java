package com.brijesh.workouttracker.workout.repository;

import com.brijesh.workouttracker.workout.domain.Weekday;
import com.brijesh.workouttracker.workout.entity.WorkoutPlanSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkoutPlanScheduleRepository extends JpaRepository<WorkoutPlanSchedule, UUID> {

    List<WorkoutPlanSchedule> findAllByPlanId(UUID planId);

    Optional<WorkoutPlanSchedule> findByPlanIdAndWeekday(UUID planId, Weekday weekday);

    void deleteAllByPlanId(UUID planId);
}
