package com.brijesh.workouttracker.progress.controller;

import com.brijesh.workouttracker.progress.dto.StepLogRequest;
import com.brijesh.workouttracker.progress.dto.StepLogResponse;
import com.brijesh.workouttracker.progress.service.StepLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
@RequestMapping("/api/v1/progress/steps")
@RequiredArgsConstructor
public class StepLogController {

    private final StepLogService stepLogService;

    @GetMapping
    public ResponseEntity<List<StepLogResponse>> list(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to
    ) {
        return ResponseEntity.ok(stepLogService.list(userId, from, to));
    }

    @GetMapping("/day")
    public ResponseEntity<StepLogResponse> getDay(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        LocalDate day = date != null ? date : LocalDate.now();
        StepLogResponse body = stepLogService.getForDate(userId, day);
        if (body == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(body);
    }

    @PutMapping
    public ResponseEntity<StepLogResponse> upsert(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody StepLogRequest request
    ) {
        return ResponseEntity.ok(stepLogService.upsert(userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        stepLogService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
