package com.brijesh.workouttracker.nutrition.controller;

import com.brijesh.workouttracker.nutrition.dto.WaterLogRequest;
import com.brijesh.workouttracker.nutrition.dto.WaterLogResponse;
import com.brijesh.workouttracker.nutrition.service.WaterLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/water")
@RequiredArgsConstructor
public class WaterLogController {

    private final WaterLogService waterLogService;

    @GetMapping
    public ResponseEntity<List<WaterLogResponse>> list(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        if (date != null) {
            return ResponseEntity.ok(waterLogService.listByDate(userId, date));
        }
        return ResponseEntity.ok(waterLogService.list(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WaterLogResponse> get(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(waterLogService.get(userId, id));
    }

    @PostMapping
    public ResponseEntity<WaterLogResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody WaterLogRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(waterLogService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WaterLogResponse> update(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id,
            @Valid @RequestBody WaterLogRequest request
    ) {
        return ResponseEntity.ok(waterLogService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        waterLogService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
