package com.brijesh.workouttracker.progress.controller;

import com.brijesh.workouttracker.progress.dto.BodyWeightProgressResponse;
import com.brijesh.workouttracker.progress.dto.ProgressSummaryResponse;
import com.brijesh.workouttracker.progress.dto.WeightGoalRequest;
import com.brijesh.workouttracker.progress.dto.WeightLogRequest;
import com.brijesh.workouttracker.progress.dto.WeightLogResponse;
import com.brijesh.workouttracker.progress.service.WeightLogService;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/progress")
@RequiredArgsConstructor
public class ProgressController {

    private final WeightLogService weightLogService;

    @GetMapping("/summary")
    public ResponseEntity<ProgressSummaryResponse> summary(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(weightLogService.summary(userId));
    }

    @GetMapping("/weight/overview")
    public ResponseEntity<BodyWeightProgressResponse> bodyWeightOverview(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(weightLogService.bodyWeightProgress(userId));
    }

    @PutMapping("/weight/goal")
    public ResponseEntity<BodyWeightProgressResponse> upsertWeightGoal(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody WeightGoalRequest request
    ) {
        return ResponseEntity.ok(weightLogService.upsertGoal(userId, request));
    }

    @GetMapping("/weight")
    public ResponseEntity<List<WeightLogResponse>> listWeight(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(weightLogService.list(userId));
    }

    @GetMapping("/weight/archived")
    public ResponseEntity<List<WeightLogResponse>> listArchivedWeight(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(weightLogService.listArchived(userId));
    }

    @GetMapping("/weight/{id}")
    public ResponseEntity<WeightLogResponse> getWeight(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(weightLogService.get(userId, id));
    }

    @PostMapping("/weight")
    public ResponseEntity<WeightLogResponse> createWeight(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody WeightLogRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(weightLogService.create(userId, request));
    }

    @PutMapping("/weight/{id}")
    public ResponseEntity<WeightLogResponse> updateWeight(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id,
            @Valid @RequestBody WeightLogRequest request
    ) {
        return ResponseEntity.ok(weightLogService.update(userId, id, request));
    }

    @DeleteMapping("/weight/{id}")
    public ResponseEntity<Void> deleteWeight(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        weightLogService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/weight/{id}/archive")
    public ResponseEntity<WeightLogResponse> archiveWeight(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(weightLogService.archive(userId, id));
    }
}
