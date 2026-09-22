package com.brijesh.workouttracker.nutrition.repository;

import com.brijesh.workouttracker.nutrition.entity.NutritionTarget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NutritionTargetRepository extends JpaRepository<NutritionTarget, UUID> {

    Optional<NutritionTarget> findByUserId(String userId);

    boolean existsByUserId(String userId);

    List<NutritionTarget> findAllByWaterRemindersEnabledTrue();
}
