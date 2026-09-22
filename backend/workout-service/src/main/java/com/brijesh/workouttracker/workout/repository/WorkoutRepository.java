package com.brijesh.workouttracker.workout.repository;

import com.brijesh.workouttracker.workout.entity.Workout;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkoutRepository extends JpaRepository<Workout, UUID> {

    List<Workout> findAllByUserIdAndArchivedFalseOrderByWorkoutDateDesc(String userId);

    Page<Workout> findAllByUserIdAndArchivedFalseOrderByWorkoutDateDesc(
            String userId,
            Pageable pageable
    );

    List<Workout> findAllByUserIdAndArchivedTrueOrderByWorkoutDateDesc(String userId);

    List<Workout> findAllByUserIdAndArchivedFalseAndWorkoutDateBetweenOrderByWorkoutDateAsc(
            String userId,
            LocalDate from,
            LocalDate to
    );

    List<Workout> findAllByUserIdAndArchivedFalseAndWorkoutDateLessThanEqualOrderByWorkoutDateDesc(
            String userId,
            LocalDate date
    );

    Optional<Workout> findByIdAndUserId(UUID id, String userId);

    boolean existsByIdAndUserId(UUID id, String userId);

    boolean existsByIdAndUserIdAndArchivedFalse(UUID id, String userId);
}
