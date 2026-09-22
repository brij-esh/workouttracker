package com.brijesh.workouttracker.workout.repository;

import com.brijesh.workouttracker.workout.entity.WorkoutExercise;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkoutExerciseRepository extends JpaRepository<WorkoutExercise, UUID> {

    List<WorkoutExercise> findAllByWorkoutIdAndUserIdAndArchivedFalseOrderByCreatedAtDesc(
            UUID workoutId,
            String userId
    );

    List<WorkoutExercise> findAllByUserIdAndArchivedTrueOrderByCreatedAtDesc(String userId);

    Optional<WorkoutExercise> findByIdAndWorkoutIdAndUserId(
            UUID id,
            UUID workoutId,
            String userId
    );

    int countByWorkoutIdAndUserIdAndArchivedFalse(UUID workoutId, String userId);

    void deleteByWorkoutIdAndUserId(UUID workoutId, String userId);

    @Query("""
            select e from WorkoutExercise e, Workout w
            where e.workoutId = w.id
              and e.userId = :userId
              and lower(e.name) = lower(:name)
              and e.archived = false
              and w.archived = false
              and e.workoutId <> :excludeWorkoutId
            order by w.workoutDate desc, e.createdAt desc
            """)
    List<WorkoutExercise> findPreviousByName(
            @Param("userId") String userId,
            @Param("name") String name,
            @Param("excludeWorkoutId") UUID excludeWorkoutId,
            Pageable pageable
    );

    @Query("""
            select e from WorkoutExercise e, Workout w
            where e.workoutId = w.id
              and e.userId = :userId
              and e.archived = false
              and w.archived = false
            order by w.workoutDate desc, e.createdAt desc
            """)
    List<WorkoutExercise> findActiveForUser(@Param("userId") String userId);
}
