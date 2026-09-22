package com.brijesh.workouttracker.workout.controller;

import com.brijesh.workouttracker.workout.domain.EquipmentType;
import com.brijesh.workouttracker.workout.domain.MuscleGroup;
import com.brijesh.workouttracker.workout.dto.ExerciseLibraryMetaResponse;
import com.brijesh.workouttracker.workout.dto.LibraryExerciseRequest;
import com.brijesh.workouttracker.workout.dto.LibraryExerciseResponse;
import com.brijesh.workouttracker.workout.dto.PageResponse;
import com.brijesh.workouttracker.workout.service.LibraryExerciseService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/exercises")
@RequiredArgsConstructor
public class LibraryExerciseController {

    private final LibraryExerciseService libraryExerciseService;

    @GetMapping("/meta")
    public ResponseEntity<ExerciseLibraryMetaResponse> meta() {
        return ResponseEntity.ok(libraryExerciseService.meta());
    }

    @GetMapping
    public ResponseEntity<PageResponse<LibraryExerciseResponse>> search(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(required = false) MuscleGroup muscleGroup,
            @RequestParam(required = false) EquipmentType equipment,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size
    ) {
        return ResponseEntity.ok(
                libraryExerciseService.search(userId, muscleGroup, equipment, q, page, size)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<LibraryExerciseResponse> get(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(libraryExerciseService.get(userId, id));
    }

    @PostMapping
    public ResponseEntity<LibraryExerciseResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody LibraryExerciseRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(libraryExerciseService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LibraryExerciseResponse> update(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id,
            @Valid @RequestBody LibraryExerciseRequest request
    ) {
        return ResponseEntity.ok(libraryExerciseService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        libraryExerciseService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
