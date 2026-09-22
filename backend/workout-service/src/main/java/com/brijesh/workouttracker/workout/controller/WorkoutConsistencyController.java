package com.brijesh.workouttracker.workout.controller;

import com.brijesh.workouttracker.workout.dto.WorkoutConsistencyResponse;
import com.brijesh.workouttracker.workout.service.WorkoutConsistencyService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;

@RestController
@RequestMapping("/api/v1/workouts/consistency")
@RequiredArgsConstructor
public class WorkoutConsistencyController {

    private final WorkoutConsistencyService workoutConsistencyService;

    @GetMapping
    public ResponseEntity<WorkoutConsistencyResponse> getConsistency(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month
    ) {
        return ResponseEntity.ok(workoutConsistencyService.getConsistency(userId, month));
    }
}
