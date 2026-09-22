package com.brijesh.workouttracker.workout.repository;

import com.brijesh.workouttracker.workout.entity.ExerciseSet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExerciseSetRepository extends JpaRepository<ExerciseSet, UUID> {

    List<ExerciseSet> findAllByExerciseIdAndUserIdOrderBySetNumberAsc(UUID exerciseId, String userId);

    Optional<ExerciseSet> findByIdAndExerciseIdAndUserId(UUID id, UUID exerciseId, String userId);

    int countByExerciseIdAndUserId(UUID exerciseId, String userId);

    void deleteAllByExerciseIdAndUserId(UUID exerciseId, String userId);

    List<ExerciseSet> findAllByUserIdAndCompletedTrue(String userId);
}
