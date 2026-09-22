package com.brijesh.workouttracker.nutrition.controller;

import com.brijesh.workouttracker.nutrition.dto.NutritionTargetRequest;
import com.brijesh.workouttracker.nutrition.dto.NutritionTargetResponse;
import com.brijesh.workouttracker.nutrition.service.NutritionTargetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/nutrition/targets")
@RequiredArgsConstructor
public class NutritionTargetController {

    private final NutritionTargetService nutritionTargetService;

    @GetMapping
    public ResponseEntity<NutritionTargetResponse> get(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(nutritionTargetService.get(userId));
    }

    @PostMapping
    public ResponseEntity<NutritionTargetResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody NutritionTargetRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(nutritionTargetService.create(userId, request));
    }

    @PutMapping
    public ResponseEntity<NutritionTargetResponse> upsert(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody NutritionTargetRequest request
    ) {
        return ResponseEntity.ok(nutritionTargetService.upsert(userId, request));
    }
}
