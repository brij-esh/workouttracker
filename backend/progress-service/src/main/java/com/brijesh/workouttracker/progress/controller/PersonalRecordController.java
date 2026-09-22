package com.brijesh.workouttracker.progress.controller;

import com.brijesh.workouttracker.progress.dto.PersonalRecordRequest;
import com.brijesh.workouttracker.progress.dto.PersonalRecordResponse;
import com.brijesh.workouttracker.progress.service.PersonalRecordService;
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
@RequestMapping("/api/v1/progress/personal-records")
@RequiredArgsConstructor
public class PersonalRecordController {

    private final PersonalRecordService personalRecordService;

    @GetMapping
    public ResponseEntity<List<PersonalRecordResponse>> list(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(personalRecordService.list(userId));
    }

    @GetMapping("/archived")
    public ResponseEntity<List<PersonalRecordResponse>> listArchived(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(personalRecordService.listArchived(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PersonalRecordResponse> get(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(personalRecordService.get(userId, id));
    }

    @PostMapping
    public ResponseEntity<PersonalRecordResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody PersonalRecordRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(personalRecordService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PersonalRecordResponse> update(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id,
            @Valid @RequestBody PersonalRecordRequest request
    ) {
        return ResponseEntity.ok(personalRecordService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        personalRecordService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<PersonalRecordResponse> archive(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(personalRecordService.archive(userId, id));
    }
}
