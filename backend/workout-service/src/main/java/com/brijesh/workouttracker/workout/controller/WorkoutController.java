package com.brijesh.workouttracker.workout.controller;

import com.brijesh.workouttracker.workout.dto.CompleteWorkoutRequest;
import com.brijesh.workouttracker.workout.dto.CreateWorkoutRequest;
import com.brijesh.workouttracker.workout.dto.PageResponse;
import com.brijesh.workouttracker.workout.dto.PauseWorkoutRequest;
import com.brijesh.workouttracker.workout.dto.UpdateWorkoutRequest;
import com.brijesh.workouttracker.workout.dto.WorkoutResponse;
import com.brijesh.workouttracker.workout.service.WorkoutService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workouts")
@RequiredArgsConstructor
public class WorkoutController {

    private final WorkoutService workoutService;

    @GetMapping(params = "page")
    public ResponseEntity<PageResponse<WorkoutResponse>> getMyWorkoutsPaged(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(workoutService.getMyWorkoutsPage(userId, page, size));
    }

    @GetMapping
    public ResponseEntity<List<WorkoutResponse>> getMyWorkouts(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(workoutService.getMyWorkouts(userId));
    }

    @GetMapping("/archived")
    public ResponseEntity<List<WorkoutResponse>> getArchivedWorkouts(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(workoutService.getArchivedWorkouts(userId));
    }

    @GetMapping("/{workoutId}")
    public ResponseEntity<WorkoutResponse> getMyWorkout(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId
    ) {
        return ResponseEntity.ok(workoutService.getMyWorkout(userId, workoutId));
    }

    @PostMapping
    public ResponseEntity<WorkoutResponse> createWorkout(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody CreateWorkoutRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(workoutService.createWorkout(userId, request));
    }

    @PostMapping("/{workoutId}/pause")
    public ResponseEntity<WorkoutResponse> pauseWorkout(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId,
            @RequestBody(required = false) PauseWorkoutRequest request
    ) {
        PauseWorkoutRequest body = request != null ? request : new PauseWorkoutRequest(null);
        return ResponseEntity.ok(workoutService.pauseSession(userId, workoutId, body));
    }

    @PostMapping("/{workoutId}/resume")
    public ResponseEntity<WorkoutResponse> resumeWorkout(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId
    ) {
        return ResponseEntity.ok(workoutService.resumeSession(userId, workoutId));
    }

    @PostMapping("/{workoutId}/complete")
    public ResponseEntity<WorkoutResponse> completeWorkout(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId,
            @Valid @RequestBody CompleteWorkoutRequest request
    ) {
        return ResponseEntity.ok(workoutService.completeSession(userId, workoutId, request));
    }

    @PostMapping("/{workoutId}/archive")
    public ResponseEntity<WorkoutResponse> archiveWorkout(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId
    ) {
        return ResponseEntity.ok(workoutService.archiveWorkout(userId, workoutId));
    }

    @DeleteMapping("/{workoutId}")
    public ResponseEntity<Void> deleteWorkout(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID workoutId
    ) {
        workoutService.deleteWorkout(userId, workoutId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{workoutId}")
    public WorkoutResponse updateWorkout(
            @PathVariable UUID workoutId,
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody UpdateWorkoutRequest request
    ) {
        return workoutService.updateWorkout(workoutId, userId, request);
    }
}
