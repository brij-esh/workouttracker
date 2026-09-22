package com.brijesh.workouttracker.workout.repository;

import com.brijesh.workouttracker.workout.domain.EquipmentType;
import com.brijesh.workouttracker.workout.domain.MuscleGroup;
import com.brijesh.workouttracker.workout.entity.LibraryExercise;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface LibraryExerciseRepository extends JpaRepository<LibraryExercise, UUID> {

    @Query("""
            select e from LibraryExercise e
            where e.archived = false
              and (e.userId is null or e.userId = :userId)
              and (:muscleGroup is null or e.muscleGroup = :muscleGroup)
              and (:equipment is null or e.equipment = :equipment)
              and (
                    :q is null or :q = ''
                    or lower(e.name) like lower(concat('%', cast(:q as string), '%'))
                  )
            """)
    Page<LibraryExercise> search(
            @Param("userId") String userId,
            @Param("muscleGroup") MuscleGroup muscleGroup,
            @Param("equipment") EquipmentType equipment,
            @Param("q") String q,
            Pageable pageable
    );

    Optional<LibraryExercise> findByIdAndArchivedFalse(UUID id);

    Optional<LibraryExercise> findByIdAndUserIdAndArchivedFalse(UUID id, String userId);
}
