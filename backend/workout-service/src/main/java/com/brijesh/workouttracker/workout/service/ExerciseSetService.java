package com.brijesh.workouttracker.workout.service;

import com.brijesh.workouttracker.workout.dto.ExerciseSetRequest;
import com.brijesh.workouttracker.workout.dto.ExerciseSetResponse;
import com.brijesh.workouttracker.workout.entity.ExerciseSet;
import com.brijesh.workouttracker.workout.entity.WorkoutExercise;
import com.brijesh.workouttracker.workout.repository.ExerciseSetRepository;
import com.brijesh.workouttracker.workout.repository.WorkoutExerciseRepository;
import com.brijesh.workouttracker.workout.repository.WorkoutRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExerciseSetService {

    private static final int DEFAULT_REST_SECONDS = 90;

    private final ExerciseSetRepository exerciseSetRepository;
    private final WorkoutExerciseRepository workoutExerciseRepository;
    private final WorkoutRepository workoutRepository;

    public List<ExerciseSetResponse> list(String userId, UUID workoutId, UUID exerciseId) {
        requireOwnedActiveExercise(userId, workoutId, exerciseId);
        return exerciseSetRepository
                .findAllByExerciseIdAndUserIdOrderBySetNumberAsc(exerciseId, userId)
                .stream()
                .map(ExerciseSetResponse::fromEntity)
                .toList();
    }

    @Transactional
    public ExerciseSetResponse create(String userId, UUID workoutId, UUID exerciseId, ExerciseSetRequest request) {
        WorkoutExercise exercise = requireOwnedActiveExercise(userId, workoutId, exerciseId);
        requireEditable(userId, workoutId);

        int nextNumber = exerciseSetRepository.countByExerciseIdAndUserId(exerciseId, userId) + 1;

        ExerciseSet set = new ExerciseSet();
        set.setExerciseId(exerciseId);
        set.setWorkoutId(workoutId);
        set.setUserId(userId);
        set.setSetNumber(request.setNumber() != null ? request.setNumber() : nextNumber);
        set.setReps(request.reps());
        set.setWeightKg(request.weightKg());
        set.setCompleted(Boolean.TRUE.equals(request.completed()));
        set.setRestSeconds(request.restSeconds() != null ? request.restSeconds() : DEFAULT_REST_SECONDS);
        set.setNotes(blankToNull(request.notes()));

        ExerciseSet saved = exerciseSetRepository.save(set);
        syncExerciseAggregates(exercise);
        return ExerciseSetResponse.fromEntity(saved);
    }

    @Transactional
    public ExerciseSetResponse update(
            String userId,
            UUID workoutId,
            UUID exerciseId,
            UUID setId,
            ExerciseSetRequest request
    ) {
        WorkoutExercise exercise = requireOwnedActiveExercise(userId, workoutId, exerciseId);
        requireEditable(userId, workoutId);

        ExerciseSet set = exerciseSetRepository
                .findByIdAndExerciseIdAndUserId(setId, exerciseId, userId)
                .orElseThrow(() -> new WorkoutBadRequestException("Set not found"));

        if (request.setNumber() != null) {
            set.setSetNumber(request.setNumber());
        }
        if (request.reps() != null) {
            set.setReps(request.reps());
        }
        if (request.weightKg() != null) {
            set.setWeightKg(request.weightKg());
        }
        if (request.completed() != null) {
            set.setCompleted(request.completed());
        }
        if (request.restSeconds() != null) {
            set.setRestSeconds(request.restSeconds());
        }
        if (request.notes() != null) {
            set.setNotes(blankToNull(request.notes()));
        }

        ExerciseSet saved = exerciseSetRepository.save(set);
        syncExerciseAggregates(exercise);
        return ExerciseSetResponse.fromEntity(saved);
    }

    @Transactional
    public void delete(String userId, UUID workoutId, UUID exerciseId, UUID setId) {
        WorkoutExercise exercise = requireOwnedActiveExercise(userId, workoutId, exerciseId);
        requireEditable(userId, workoutId);

        ExerciseSet set = exerciseSetRepository
                .findByIdAndExerciseIdAndUserId(setId, exerciseId, userId)
                .orElseThrow(() -> new WorkoutBadRequestException("Set not found"));

        exerciseSetRepository.delete(set);
        renumberSets(exerciseId, userId);
        syncExerciseAggregates(exercise);
    }

    private void renumberSets(UUID exerciseId, String userId) {
        List<ExerciseSet> sets = exerciseSetRepository
                .findAllByExerciseIdAndUserIdOrderBySetNumberAsc(exerciseId, userId);
        int number = 1;
        for (ExerciseSet set : sets) {
            set.setSetNumber(number++);
        }
        exerciseSetRepository.saveAll(sets);
    }

    private void syncExerciseAggregates(WorkoutExercise exercise) {
        List<ExerciseSet> sets = exerciseSetRepository
                .findAllByExerciseIdAndUserIdOrderBySetNumberAsc(exercise.getId(), exercise.getUserId());

        exercise.setSets(sets.isEmpty() ? null : sets.size());

        Integer maxReps = sets.stream()
                .map(ExerciseSet::getReps)
                .filter(r -> r != null && r > 0)
                .max(Integer::compareTo)
                .orElse(null);
        exercise.setMaxReps(maxReps);

        BigDecimal maxWeight = sets.stream()
                .map(ExerciseSet::getWeightKg)
                .filter(w -> w != null && w.compareTo(BigDecimal.ZERO) >= 0)
                .max(Comparator.naturalOrder())
                .orElse(null);
        exercise.setMaxWeightKg(maxWeight);

        ExerciseSet heaviest = sets.stream()
                .filter(s -> s.getWeightKg() != null)
                .max(Comparator.comparing(ExerciseSet::getWeightKg))
                .orElse(null);

        if (heaviest != null) {
            exercise.setWeightKg(heaviest.getWeightKg());
            exercise.setReps(heaviest.getReps());
            exercise.setOneRmKg(estimateOneRm(heaviest.getWeightKg(), heaviest.getReps()));
        } else {
            ExerciseSet withReps = sets.stream()
                    .filter(s -> s.getReps() != null)
                    .findFirst()
                    .orElse(null);
            exercise.setWeightKg(null);
            exercise.setReps(withReps != null ? withReps.getReps() : null);
            exercise.setOneRmKg(null);
        }

        workoutExerciseRepository.save(exercise);
    }

    private void requireEditable(String userId, UUID workoutId) {
        var workout = workoutRepository
                .findByIdAndUserId(workoutId, userId)
                .orElseThrow(() -> new WorkoutNotFoundException(workoutId));
        if (WorkoutSessionRules.expirePausedIfNeeded(workout)) {
            workoutRepository.save(workout);
        }
        WorkoutSessionRules.requireEditable(workout, "edited");
    }

    private WorkoutExercise requireOwnedActiveExercise(String userId, UUID workoutId, UUID exerciseId) {
        if (!workoutRepository.existsByIdAndUserIdAndArchivedFalse(workoutId, userId)) {
            if (!workoutRepository.existsByIdAndUserId(workoutId, userId)) {
                throw new WorkoutNotFoundException(workoutId);
            }
            throw new WorkoutBadRequestException("This workout is archived");
        }

        WorkoutExercise exercise = workoutExerciseRepository
                .findByIdAndWorkoutIdAndUserId(exerciseId, workoutId, userId)
                .orElseThrow(() -> new WorkoutExerciseNotFoundException(exerciseId));
        if (exercise.isArchived()) {
            throw new WorkoutBadRequestException("This exercise is archived");
        }
        return exercise;
    }

    private BigDecimal estimateOneRm(BigDecimal weightKg, Integer reps) {
        if (weightKg == null || reps == null || reps < 1) {
            return null;
        }
        if (reps == 1) {
            return weightKg.setScale(2, RoundingMode.HALF_UP);
        }
        return weightKg
                .multiply(BigDecimal.valueOf(1 + (reps / 30.0)))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
