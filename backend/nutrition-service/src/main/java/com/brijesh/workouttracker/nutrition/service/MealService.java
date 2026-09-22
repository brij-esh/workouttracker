package com.brijesh.workouttracker.nutrition.service;

import com.brijesh.workouttracker.events.DomainEventPublisher;
import com.brijesh.workouttracker.events.KafkaTopics;
import com.brijesh.workouttracker.events.NutritionEventType;
import com.brijesh.workouttracker.events.NutritionLoggedEvent;
import com.brijesh.workouttracker.nutrition.domain.FoodQuantityUnit;
import com.brijesh.workouttracker.nutrition.dto.DailyNutritionSummaryResponse;
import com.brijesh.workouttracker.nutrition.dto.MealRequest;
import com.brijesh.workouttracker.nutrition.dto.MealResponse;
import com.brijesh.workouttracker.nutrition.dto.NutritionTargetResponse;
import com.brijesh.workouttracker.nutrition.entity.Meal;
import com.brijesh.workouttracker.nutrition.repository.MealRepository;
import com.brijesh.workouttracker.nutrition.repository.NutritionTargetRepository;
import com.brijesh.workouttracker.nutrition.repository.WaterLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MealService {

    private final MealRepository mealRepository;
    private final WaterLogRepository waterLogRepository;
    private final NutritionTargetRepository nutritionTargetRepository;
    private final DomainEventPublisher domainEventPublisher;

    public List<MealResponse> list(String userId) {
        return mealRepository.findAllByUserIdOrderByMealDateDesc(userId)
                .stream()
                .map(MealResponse::fromEntity)
                .toList();
    }

    public List<MealResponse> listByDate(String userId, LocalDate date) {
        return mealRepository.findAllByUserIdAndMealDateOrderByCreatedAtAsc(userId, date)
                .stream()
                .map(MealResponse::fromEntity)
                .toList();
    }

    public MealResponse get(String userId, UUID id) {
        return MealResponse.fromEntity(findOwned(userId, id));
    }

    @Transactional
    public MealResponse create(String userId, MealRequest request) {
        Meal meal = new Meal();
        meal.setUserId(userId);
        apply(meal, request);
        Meal saved = mealRepository.save(meal);
        domainEventPublisher.publish(
                KafkaTopics.NUTRITION_EVENTS,
                userId,
                new NutritionLoggedEvent(
                        NutritionEventType.MEAL_LOGGED,
                        saved.getId(),
                        userId,
                        saved.getMealDate(),
                        "Meal logged: " + saved.getName() + " (" + saved.getCalories() + " kcal)",
                        Instant.now(),
                        null
                )
        );
        return MealResponse.fromEntity(saved);
    }

    @Transactional
    public MealResponse update(String userId, UUID id, MealRequest request) {
        Meal meal = findOwned(userId, id);
        apply(meal, request);
        meal.setUpdatedAt(Instant.now());
        return MealResponse.fromEntity(mealRepository.saveAndFlush(meal));
    }

    @Transactional
    public void delete(String userId, UUID id) {
        mealRepository.delete(findOwned(userId, id));
    }

    public DailyNutritionSummaryResponse dailySummary(String userId, LocalDate date) {
        List<Meal> meals = mealRepository.findAllByUserIdAndMealDateOrderByCreatedAtAsc(userId, date);

        int calories = meals.stream().mapToInt(Meal::getCalories).sum();
        BigDecimal protein = sumMacro(meals, Meal::getProteinG);
        BigDecimal carbs = sumMacro(meals, Meal::getCarbsG);
        BigDecimal fat = sumMacro(meals, Meal::getFatG);
        int water = java.util.Optional
                .ofNullable(waterLogRepository.sumAmountMlByUserIdAndLoggedOn(userId, date))
                .orElse(0);

        NutritionTargetResponse targets = nutritionTargetRepository.findByUserId(userId)
                .map(NutritionTargetResponse::fromEntity)
                .orElse(null);

        Integer remainingCalories = null;
        BigDecimal remainingProtein = null;
        BigDecimal remainingCarbs = null;
        BigDecimal remainingFat = null;
        Integer remainingWater = null;

        if (targets != null) {
            remainingCalories = targets.calorieTarget() - calories;
            remainingProtein = targets.proteinGTarget().subtract(protein);
            remainingCarbs = targets.carbsGTarget().subtract(carbs);
            remainingFat = targets.fatGTarget().subtract(fat);
            remainingWater = targets.waterMlTarget() - water;
        }

        return new DailyNutritionSummaryResponse(
                date,
                calories,
                protein,
                carbs,
                fat,
                water,
                targets,
                remainingCalories,
                remainingProtein,
                remainingCarbs,
                remainingFat,
                remainingWater,
                meals.stream().map(MealResponse::fromEntity).toList()
        );
    }

    private Meal findOwned(String userId, UUID id) {
        return mealRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NutritionResourceNotFoundException("Meal", id));
    }

    private void apply(Meal meal, MealRequest request) {
        meal.setMealDate(request.mealDate());
        meal.setMealType(request.mealType());
        meal.setName(request.name());
        meal.setQuantity(request.quantity() != null ? request.quantity() : BigDecimal.ONE);
        meal.setQuantityUnit(
                request.quantityUnit() != null ? request.quantityUnit() : FoodQuantityUnit.GRAMS
        );
        meal.setCalories(request.calories());
        meal.setProteinG(defaultZero(request.proteinG()));
        meal.setCarbsG(defaultZero(request.carbsG()));
        meal.setFatG(defaultZero(request.fatG()));
        meal.setNotes(request.notes());
    }

    private static BigDecimal defaultZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static BigDecimal sumMacro(
            List<Meal> meals,
            java.util.function.Function<Meal, BigDecimal> extractor
    ) {
        return meals.stream()
                .map(extractor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
