package com.brijesh.workouttracker.workout.controller;

import com.brijesh.workouttracker.workout.dto.strength.StrengthExerciseDetailDto;
import com.brijesh.workouttracker.workout.dto.strength.StrengthExerciseSummaryDto;
import com.brijesh.workouttracker.workout.service.StrengthProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/strength-progress")
@RequiredArgsConstructor
public class StrengthProgressController {

    private final StrengthProgressService strengthProgressService;

    @GetMapping
    public ResponseEntity<List<StrengthExerciseSummaryDto>> list(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(strengthProgressService.list(userId));
    }

    @GetMapping("/{exerciseKey}")
    public ResponseEntity<StrengthExerciseDetailDto> detail(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String exerciseKey
    ) {
        return ResponseEntity.ok(strengthProgressService.detail(userId, exerciseKey));
    }
}
