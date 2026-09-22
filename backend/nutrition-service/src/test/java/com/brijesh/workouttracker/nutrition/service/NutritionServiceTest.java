package com.brijesh.workouttracker.nutrition.service;

import com.brijesh.workouttracker.events.DomainEventPublisher;
import com.brijesh.workouttracker.nutrition.domain.MealType;
import com.brijesh.workouttracker.nutrition.dto.MealRequest;
import com.brijesh.workouttracker.nutrition.dto.NutritionTargetRequest;
import com.brijesh.workouttracker.nutrition.entity.Meal;
import com.brijesh.workouttracker.nutrition.entity.NutritionTarget;
import com.brijesh.workouttracker.nutrition.repository.MealRepository;
import com.brijesh.workouttracker.nutrition.repository.NutritionTargetRepository;
import com.brijesh.workouttracker.nutrition.repository.WaterLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NutritionServiceTest {

    @Mock
    private MealRepository mealRepository;

    @Mock
    private WaterLogRepository waterLogRepository;

    @Mock
    private NutritionTargetRepository nutritionTargetRepository;

    @Mock
    private DomainEventPublisher domainEventPublisher;

    @InjectMocks
    private MealService mealService;

    @InjectMocks
    private NutritionTargetService nutritionTargetService;

    @Test
    void shouldCreateMeal() {
        String userId = "firebase-user-1";
        MealRequest request = new MealRequest(
                LocalDate.of(2026, 9, 19),
                MealType.LUNCH,
                "Chicken bowl",
                new BigDecimal("250"),
                com.brijesh.workouttracker.nutrition.domain.FoodQuantityUnit.GRAMS,
                550,
                new BigDecimal("40.0"),
                new BigDecimal("45.0"),
                new BigDecimal("15.0"),
                null
        );

        when(mealRepository.save(any(Meal.class))).thenAnswer(invocation -> {
            Meal meal = invocation.getArgument(0);
            meal.setId(UUID.randomUUID());
            return meal;
        });

        var response = mealService.create(userId, request);

        assertEquals("Chicken bowl", response.name());
        assertEquals(550, response.calories());
        verify(mealRepository).save(any(Meal.class));
    }

    @Test
    void shouldBuildDailySummaryWithRemainingMacros() {
        String userId = "firebase-user-1";
        LocalDate date = LocalDate.of(2026, 9, 19);

        Meal meal = new Meal();
        meal.setId(UUID.randomUUID());
        meal.setUserId(userId);
        meal.setMealDate(date);
        meal.setMealType(MealType.BREAKFAST);
        meal.setName("Oats");
        meal.setQuantity(new BigDecimal("80"));
        meal.setQuantityUnit(com.brijesh.workouttracker.nutrition.domain.FoodQuantityUnit.GRAMS);
        meal.setCalories(400);
        meal.setProteinG(new BigDecimal("20.0"));
        meal.setCarbsG(new BigDecimal("50.0"));
        meal.setFatG(new BigDecimal("10.0"));

        NutritionTarget target = new NutritionTarget();
        target.setId(UUID.randomUUID());
        target.setUserId(userId);
        target.setCalorieTarget(2200);
        target.setProteinGTarget(new BigDecimal("150.0"));
        target.setCarbsGTarget(new BigDecimal("220.0"));
        target.setFatGTarget(new BigDecimal("70.0"));
        target.setFiberGTarget(new BigDecimal("30.0"));
        target.setWaterMlTarget(3000);
        target.setNutritionGoal(com.brijesh.workouttracker.nutrition.domain.NutritionGoal.MAINTENANCE);
        target.setManualOverride(false);

        when(mealRepository.findAllByUserIdAndMealDateOrderByCreatedAtAsc(userId, date))
                .thenReturn(List.of(meal));
        when(waterLogRepository.sumAmountMlByUserIdAndLoggedOn(userId, date))
                .thenReturn(750);
        when(nutritionTargetRepository.findByUserId(userId))
                .thenReturn(Optional.of(target));

        var summary = mealService.dailySummary(userId, date);

        assertEquals(400, summary.totalCalories());
        assertEquals(750, summary.totalWaterMl());
        assertEquals(1800, summary.remainingCalories());
        assertEquals(new BigDecimal("130.0"), summary.remainingProteinG());
        assertEquals(2250, summary.remainingWaterMl());
    }

    @Test
    void shouldRejectDuplicateTargetsOnCreate() {
        String userId = "firebase-user-1";
        NutritionTargetRequest request = new NutritionTargetRequest(
                2200,
                new BigDecimal("150.0"),
                new BigDecimal("220.0"),
                new BigDecimal("70.0"),
                new BigDecimal("30.0"),
                3000,
                com.brijesh.workouttracker.nutrition.domain.NutritionGoal.MAINTENANCE,
                false,
                false
        );

        when(nutritionTargetRepository.existsByUserId(userId)).thenReturn(true);

        assertThrows(
                NutritionConflictException.class,
                () -> nutritionTargetService.create(userId, request)
        );
    }
}
