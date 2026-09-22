package com.brijesh.workouttracker.progress.controller;

import com.brijesh.workouttracker.progress.dto.BodyMeasurementRequest;
import com.brijesh.workouttracker.progress.dto.BodyMeasurementResponse;
import com.brijesh.workouttracker.progress.service.BodyMeasurementService;
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
@RequestMapping("/api/v1/body-measurements")
@RequiredArgsConstructor
public class BodyMeasurementController {

    private final BodyMeasurementService bodyMeasurementService;

    @GetMapping
    public ResponseEntity<List<BodyMeasurementResponse>> list(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(bodyMeasurementService.list(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BodyMeasurementResponse> get(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(bodyMeasurementService.get(userId, id));
    }

    @PostMapping
    public ResponseEntity<BodyMeasurementResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody BodyMeasurementRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bodyMeasurementService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BodyMeasurementResponse> update(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id,
            @Valid @RequestBody BodyMeasurementRequest request
    ) {
        return ResponseEntity.ok(bodyMeasurementService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        bodyMeasurementService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
