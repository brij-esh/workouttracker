package com.brijesh.workouttracker.nutrition.controller;

import com.brijesh.workouttracker.nutrition.domain.FoodCategory;
import com.brijesh.workouttracker.nutrition.domain.FoodRegion;
import com.brijesh.workouttracker.nutrition.dto.FoodItemRequest;
import com.brijesh.workouttracker.nutrition.dto.FoodItemResponse;
import com.brijesh.workouttracker.nutrition.dto.FoodLibraryMetaResponse;
import com.brijesh.workouttracker.nutrition.service.FoodItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/nutrition/foods")
@RequiredArgsConstructor
public class FoodItemController {

    private final FoodItemService foodItemService;

    @GetMapping("/meta")
    public ResponseEntity<FoodLibraryMetaResponse> meta() {
        return ResponseEntity.ok(foodItemService.meta());
    }

    @GetMapping
    public ResponseEntity<List<FoodItemResponse>> search(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) FoodCategory category,
            @RequestParam(required = false) FoodRegion region
    ) {
        return ResponseEntity.ok(foodItemService.search(userId, q, category, region));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FoodItemResponse> get(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(foodItemService.get(userId, id));
    }

    @PostMapping
    public ResponseEntity<FoodItemResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody FoodItemRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(foodItemService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FoodItemResponse> update(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id,
            @Valid @RequestBody FoodItemRequest request
    ) {
        return ResponseEntity.ok(foodItemService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        foodItemService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
