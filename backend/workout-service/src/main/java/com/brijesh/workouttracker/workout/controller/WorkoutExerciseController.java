package com.brijesh.workouttracker.workout.controller;

import com.brijesh.workouttracker.workout.dto.ExercisePreviousPerformanceResponse;
import com.brijesh.workouttracker.workout.dto.WorkoutExerciseRequest;
import com.brijesh.workouttracker.workout.dto.WorkoutExerciseResponse;
import com.brijesh.workouttracker.workout.service.WorkoutExerciseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class WorkoutExerciseController {

    private final WorkoutExerciseService workoutExerciseService;

    @GetMapping("/api/v1/workouts/exercises/archived")
    public ResponseEntity<List<WorkoutExerciseResponse>> listArchived(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(workoutExerciseService.listArchived(userId));
    }

    @GetMapping("/api/v1/workouts/{workoutId}/exercises")
    public ResponseEntity<List<WorkoutExerciseResponse>> list(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId
    ) {
        return ResponseEntity.ok(workoutExerciseService.list(userId, workoutId));
    }

    @GetMapping("/api/v1/workouts/{workoutId}/exercises/{exerciseId}/previous-performance")
    public ResponseEntity<ExercisePreviousPerformanceResponse> previousPerformance(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId,
            @PathVariable UUID exerciseId
    ) {
        return ResponseEntity.ok(
                workoutExerciseService.previousPerformance(userId, workoutId, exerciseId)
        );
    }

    @PostMapping("/api/v1/workouts/{workoutId}/exercises")
    public ResponseEntity<WorkoutExerciseResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId,
            @Valid @RequestBody WorkoutExerciseRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(workoutExerciseService.create(userId, workoutId, request));
    }

    @PutMapping("/api/v1/workouts/{workoutId}/exercises/{exerciseId}")
    public ResponseEntity<WorkoutExerciseResponse> update(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId,
            @PathVariable UUID exerciseId,
            @Valid @RequestBody WorkoutExerciseRequest request
    ) {
        return ResponseEntity.ok(
                workoutExerciseService.update(userId, workoutId, exerciseId, request)
        );
    }

    @PostMapping("/api/v1/workouts/{workoutId}/exercises/{exerciseId}/archive")
    public ResponseEntity<WorkoutExerciseResponse> archive(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId,
            @PathVariable UUID exerciseId
    ) {
        return ResponseEntity.ok(workoutExerciseService.archive(userId, workoutId, exerciseId));
    }

    @DeleteMapping("/api/v1/workouts/{workoutId}/exercises/{exerciseId}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId,
            @PathVariable UUID exerciseId
    ) {
        workoutExerciseService.delete(userId, workoutId, exerciseId);
        return ResponseEntity.noContent().build();
    }
}
