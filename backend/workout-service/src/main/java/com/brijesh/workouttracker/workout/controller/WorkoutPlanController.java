package com.brijesh.workouttracker.workout.controller;

import com.brijesh.workouttracker.workout.domain.PlanTemplateType;
import com.brijesh.workouttracker.workout.domain.Weekday;
import com.brijesh.workouttracker.workout.dto.CreateWorkoutPlanRequest;
import com.brijesh.workouttracker.workout.dto.StartPlanDayRequest;
import com.brijesh.workouttracker.workout.dto.UpdatePlanScheduleRequest;
import com.brijesh.workouttracker.workout.dto.UpdateWorkoutPlanRequest;
import com.brijesh.workouttracker.workout.dto.WorkoutPlanResponse;
import com.brijesh.workouttracker.workout.dto.WorkoutResponse;
import com.brijesh.workouttracker.workout.service.WorkoutPlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workout-plans")
@RequiredArgsConstructor
public class WorkoutPlanController {

    private final WorkoutPlanService workoutPlanService;

    @GetMapping
    public ResponseEntity<List<WorkoutPlanResponse>> list(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(workoutPlanService.list(userId));
    }

    @GetMapping("/{planId}")
    public ResponseEntity<WorkoutPlanResponse> get(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID planId
    ) {
        return ResponseEntity.ok(workoutPlanService.get(userId, planId));
    }

    @PostMapping
    public ResponseEntity<WorkoutPlanResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody CreateWorkoutPlanRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(workoutPlanService.create(userId, request));
    }

    @PostMapping("/templates/{templateType}")
    public ResponseEntity<WorkoutPlanResponse> seedTemplate(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable PlanTemplateType templateType,
            @RequestParam(required = false) Weekday restWeekday
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(workoutPlanService.seedTemplate(userId, templateType, restWeekday));
    }

    @PutMapping("/{planId}")
    public ResponseEntity<WorkoutPlanResponse> update(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID planId,
            @Valid @RequestBody UpdateWorkoutPlanRequest request
    ) {
        return ResponseEntity.ok(workoutPlanService.updateDetails(userId, planId, request));
    }

    @PutMapping("/{planId}/schedule")
    public ResponseEntity<WorkoutPlanResponse> updateSchedule(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID planId,
            @Valid @RequestBody UpdatePlanScheduleRequest request
    ) {
        return ResponseEntity.ok(workoutPlanService.updateSchedule(userId, planId, request));
    }

    @PostMapping("/{planId}/start-day")
    public ResponseEntity<WorkoutResponse> startDay(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID planId,
            @Valid @RequestBody StartPlanDayRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(workoutPlanService.startDay(userId, planId, request));
    }

    @PostMapping("/{planId}/start-today")
    public ResponseEntity<WorkoutResponse> startToday(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID planId
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(workoutPlanService.startToday(userId, planId));
    }

    @PostMapping("/{planId}/archive")
    public ResponseEntity<WorkoutPlanResponse> archive(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID planId
    ) {
        return ResponseEntity.ok(workoutPlanService.archive(userId, planId));
    }

    @DeleteMapping("/{planId}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID planId
    ) {
        workoutPlanService.delete(userId, planId);
        return ResponseEntity.noContent().build();
    }
}
