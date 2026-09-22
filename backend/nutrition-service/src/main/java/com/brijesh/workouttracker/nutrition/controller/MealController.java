package com.brijesh.workouttracker.nutrition.controller;

import com.brijesh.workouttracker.nutrition.dto.DailyNutritionSummaryResponse;
import com.brijesh.workouttracker.nutrition.dto.MealRequest;
import com.brijesh.workouttracker.nutrition.dto.MealResponse;
import com.brijesh.workouttracker.nutrition.service.MealService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/nutrition")
@RequiredArgsConstructor
public class MealController {

    private final MealService mealService;

    @GetMapping("/daily")
    public ResponseEntity<DailyNutritionSummaryResponse> dailySummary(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(mealService.dailySummary(userId, targetDate));
    }

    @GetMapping("/meals")
    public ResponseEntity<List<MealResponse>> listMeals(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        if (date != null) {
            return ResponseEntity.ok(mealService.listByDate(userId, date));
        }
        return ResponseEntity.ok(mealService.list(userId));
    }

    @GetMapping("/meals/{id}")
    public ResponseEntity<MealResponse> getMeal(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(mealService.get(userId, id));
    }

    @PostMapping("/meals")
    public ResponseEntity<MealResponse> createMeal(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody MealRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(mealService.create(userId, request));
    }

    @PutMapping("/meals/{id}")
    public ResponseEntity<MealResponse> updateMeal(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id,
            @Valid @RequestBody MealRequest request
    ) {
        return ResponseEntity.ok(mealService.update(userId, id, request));
    }

    @DeleteMapping("/meals/{id}")
    public ResponseEntity<Void> deleteMeal(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        mealService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
