package com.brijesh.workouttracker.nutrition.repository;

import com.brijesh.workouttracker.nutrition.entity.Meal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MealRepository extends JpaRepository<Meal, UUID> {

    List<Meal> findAllByUserIdOrderByMealDateDesc(String userId);

    List<Meal> findAllByUserIdAndMealDateOrderByCreatedAtAsc(String userId, LocalDate mealDate);

    Optional<Meal> findByIdAndUserId(UUID id, String userId);
}
