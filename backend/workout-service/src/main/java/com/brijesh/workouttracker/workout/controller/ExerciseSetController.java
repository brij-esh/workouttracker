package com.brijesh.workouttracker.workout.controller;

import com.brijesh.workouttracker.workout.dto.ExerciseSetRequest;
import com.brijesh.workouttracker.workout.dto.ExerciseSetResponse;
import com.brijesh.workouttracker.workout.service.ExerciseSetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ExerciseSetController {

    private final ExerciseSetService exerciseSetService;

    @GetMapping("/api/v1/workouts/{workoutId}/exercises/{exerciseId}/sets")
    public ResponseEntity<List<ExerciseSetResponse>> list(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId,
            @PathVariable UUID exerciseId
    ) {
        return ResponseEntity.ok(exerciseSetService.list(userId, workoutId, exerciseId));
    }

    @PostMapping("/api/v1/workouts/{workoutId}/exercises/{exerciseId}/sets")
    public ResponseEntity<ExerciseSetResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId,
            @PathVariable UUID exerciseId,
            @Valid @RequestBody ExerciseSetRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(exerciseSetService.create(userId, workoutId, exerciseId, request));
    }

    @PutMapping("/api/v1/workouts/{workoutId}/exercises/{exerciseId}/sets/{setId}")
    public ResponseEntity<ExerciseSetResponse> update(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId,
            @PathVariable UUID exerciseId,
            @PathVariable UUID setId,
            @Valid @RequestBody ExerciseSetRequest request
    ) {
        return ResponseEntity.ok(
                exerciseSetService.update(userId, workoutId, exerciseId, setId, request)
        );
    }

    @DeleteMapping("/api/v1/workouts/{workoutId}/exercises/{exerciseId}/sets/{setId}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId,
            @PathVariable UUID exerciseId,
            @PathVariable UUID setId
    ) {
        exerciseSetService.delete(userId, workoutId, exerciseId, setId);
        return ResponseEntity.noContent().build();
    }
}
