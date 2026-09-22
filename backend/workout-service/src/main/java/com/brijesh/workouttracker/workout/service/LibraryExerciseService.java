package com.brijesh.workouttracker.workout.service;

import com.brijesh.workouttracker.workout.domain.EquipmentType;
import com.brijesh.workouttracker.workout.domain.MuscleGroup;
import com.brijesh.workouttracker.workout.dto.ExerciseLibraryMetaResponse;
import com.brijesh.workouttracker.workout.dto.LibraryExerciseRequest;
import com.brijesh.workouttracker.workout.dto.LibraryExerciseResponse;
import com.brijesh.workouttracker.workout.dto.PageResponse;
import com.brijesh.workouttracker.workout.entity.LibraryExercise;
import com.brijesh.workouttracker.workout.repository.LibraryExerciseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LibraryExerciseService {

    private static final int DEFAULT_SIZE = 24;
    private static final int MAX_SIZE = 50;

    private final LibraryExerciseRepository libraryExerciseRepository;

    public PageResponse<LibraryExerciseResponse> search(
            String userId,
            MuscleGroup muscleGroup,
            EquipmentType equipment,
            String q,
            int page,
            int size
    ) {
        var result = libraryExerciseRepository.search(
                userId,
                muscleGroup,
                equipment,
                blankToNull(q),
                PageRequest.of(Math.max(page, 0), clampSize(size), Sort.by("name").ascending())
        );
        return PageResponse.from(result.map(LibraryExerciseResponse::fromEntity));
    }

    public LibraryExerciseResponse get(String userId, UUID id) {
        LibraryExercise exercise = libraryExerciseRepository
                .findByIdAndArchivedFalse(id)
                .orElseThrow(() -> new WorkoutBadRequestException("Exercise not found"));
        if (exercise.getUserId() != null && !exercise.getUserId().equals(userId)) {
            throw new WorkoutBadRequestException("Exercise not found");
        }
        return LibraryExerciseResponse.fromEntity(exercise);
    }

    public ExerciseLibraryMetaResponse meta() {
        return ExerciseLibraryMetaResponse.defaults();
    }

    @Transactional
    public LibraryExerciseResponse create(String userId, LibraryExerciseRequest request) {
        LibraryExercise exercise = new LibraryExercise();
        exercise.setUserId(userId);
        apply(exercise, request);
        return LibraryExerciseResponse.fromEntity(libraryExerciseRepository.save(exercise));
    }

    @Transactional
    public LibraryExerciseResponse update(String userId, UUID id, LibraryExerciseRequest request) {
        LibraryExercise exercise = libraryExerciseRepository
                .findByIdAndUserIdAndArchivedFalse(id, userId)
                .orElseThrow(() -> new WorkoutBadRequestException("Custom exercise not found"));
        apply(exercise, request);
        return LibraryExerciseResponse.fromEntity(libraryExerciseRepository.save(exercise));
    }

    @Transactional
    public void delete(String userId, UUID id) {
        LibraryExercise exercise = libraryExerciseRepository
                .findByIdAndUserIdAndArchivedFalse(id, userId)
                .orElseThrow(() -> new WorkoutBadRequestException("Custom exercise not found"));
        exercise.setArchived(true);
        libraryExerciseRepository.save(exercise);
    }

    private void apply(LibraryExercise exercise, LibraryExerciseRequest request) {
        exercise.setName(request.name().trim());
        exercise.setMuscleGroup(request.muscleGroup());
        exercise.setEquipment(request.equipment());
        exercise.setInstructions(blankToNull(request.instructions()));
        exercise.setDifficulty(request.difficulty());
    }

    private int clampSize(int size) {
        if (size <= 0) {
            return DEFAULT_SIZE;
        }
        return Math.min(size, MAX_SIZE);
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
