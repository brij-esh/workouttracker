package com.brijesh.workouttracker.workout.service;

import com.brijesh.workouttracker.workout.dto.ExercisePreviousPerformanceResponse;
import com.brijesh.workouttracker.workout.dto.WorkoutExerciseRequest;
import com.brijesh.workouttracker.workout.dto.WorkoutExerciseResponse;
import com.brijesh.workouttracker.workout.entity.ExerciseSet;
import com.brijesh.workouttracker.workout.entity.Workout;
import com.brijesh.workouttracker.workout.entity.WorkoutExercise;
import com.brijesh.workouttracker.workout.repository.ExerciseSetRepository;
import com.brijesh.workouttracker.workout.repository.WorkoutExerciseRepository;
import com.brijesh.workouttracker.workout.repository.WorkoutRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkoutExerciseService {

    private final WorkoutRepository workoutRepository;
    private final WorkoutExerciseRepository workoutExerciseRepository;
    private final ExerciseSetRepository exerciseSetRepository;

    public List<WorkoutExerciseResponse> list(String userId, UUID workoutId) {
        requireOwnedActiveWorkout(userId, workoutId);
        return workoutExerciseRepository
                .findAllByWorkoutIdAndUserIdAndArchivedFalseOrderByCreatedAtDesc(workoutId, userId)
                .stream()
                .map(WorkoutExerciseResponse::fromEntity)
                .toList();
    }

    public List<WorkoutExerciseResponse> listArchived(String userId) {
        return workoutExerciseRepository
                .findAllByUserIdAndArchivedTrueOrderByCreatedAtDesc(userId)
                .stream()
                .map(WorkoutExerciseResponse::fromEntity)
                .toList();
    }

    public ExercisePreviousPerformanceResponse previousPerformance(
            String userId,
            UUID workoutId,
            UUID exerciseId
    ) {
        WorkoutExercise current = findOwnedActive(userId, workoutId, exerciseId);
        List<WorkoutExercise> previous = workoutExerciseRepository.findPreviousByName(
                userId,
                current.getName(),
                workoutId,
                PageRequest.of(0, 1)
        );
        if (previous.isEmpty()) {
            return ExercisePreviousPerformanceResponse.empty();
        }

        WorkoutExercise prior = previous.getFirst();
        Workout priorWorkout = workoutRepository
                .findByIdAndUserId(prior.getWorkoutId(), userId)
                .orElse(null);

        List<ExerciseSet> sets = exerciseSetRepository
                .findAllByExerciseIdAndUserIdOrderBySetNumberAsc(prior.getId(), userId);

        List<ExercisePreviousPerformanceResponse.PreviousSet> setRows = sets.stream()
                .map(s -> new ExercisePreviousPerformanceResponse.PreviousSet(
                        s.getSetNumber(),
                        s.getReps(),
                        s.getWeightKg(),
                        s.isCompleted()
                ))
                .toList();

        ExercisePreviousPerformanceResponse.Target target = buildTarget(prior, sets);

        return new ExercisePreviousPerformanceResponse(
                true,
                prior.getId(),
                prior.getWorkoutId(),
                priorWorkout != null ? priorWorkout.getName() : null,
                priorWorkout != null ? priorWorkout.getWorkoutDate() : null,
                setRows,
                target
        );
    }

    @Transactional
    public WorkoutExerciseResponse create(String userId, UUID workoutId, WorkoutExerciseRequest request) {
        Workout workout = requireOwnedActiveWorkoutEntity(userId, workoutId);
        if (WorkoutSessionRules.expirePausedIfNeeded(workout)) {
            workoutRepository.save(workout);
        }
        WorkoutSessionRules.requireEditable(workout, "edited");

        int nextOrder = workoutExerciseRepository.countByWorkoutIdAndUserIdAndArchivedFalse(workoutId, userId);

        WorkoutExercise exercise = new WorkoutExercise();
        exercise.setWorkoutId(workoutId);
        exercise.setUserId(userId);
        exercise.setArchived(false);
        apply(exercise, request, request.sortOrder() != null ? request.sortOrder() : nextOrder);

        return WorkoutExerciseResponse.fromEntity(workoutExerciseRepository.save(exercise));
    }

    @Transactional
    public WorkoutExerciseResponse update(
            String userId,
            UUID workoutId,
            UUID exerciseId,
            WorkoutExerciseRequest request
    ) {
        Workout workout = requireOwnedActiveWorkoutEntity(userId, workoutId);
        if (WorkoutSessionRules.expirePausedIfNeeded(workout)) {
            workoutRepository.save(workout);
        }
        WorkoutSessionRules.requireEditable(workout, "edited");
        WorkoutExercise exercise = findOwnedActive(userId, workoutId, exerciseId);

        Integer sortOrder = request.sortOrder() != null ? request.sortOrder() : exercise.getSortOrder();
        apply(exercise, request, sortOrder);
        return WorkoutExerciseResponse.fromEntity(workoutExerciseRepository.save(exercise));
    }

    @Transactional
    public void delete(String userId, UUID workoutId, UUID exerciseId) {
        Workout workout = requireOwnedActiveWorkoutEntity(userId, workoutId);
        if (WorkoutSessionRules.expirePausedIfNeeded(workout)) {
            workoutRepository.save(workout);
        }
        WorkoutSessionRules.requireEditable(workout, "deleted");
        WorkoutExercise exercise = findOwnedActive(userId, workoutId, exerciseId);
        workoutExerciseRepository.delete(exercise);
    }

    @Transactional
    public WorkoutExerciseResponse archive(String userId, UUID workoutId, UUID exerciseId) {
        WorkoutExercise exercise = findOwnedActive(userId, workoutId, exerciseId);
        exercise.setArchived(true);
        exercise.setUpdatedAt(Instant.now());
        return WorkoutExerciseResponse.fromEntity(workoutExerciseRepository.save(exercise));
    }

    private ExercisePreviousPerformanceResponse.Target buildTarget(
            WorkoutExercise prior,
            List<ExerciseSet> sets
    ) {
        if (sets.isEmpty()) {
            if (prior.getWeightKg() == null && prior.getReps() == null && prior.getSets() == null) {
                return null;
            }
            Integer setCount = prior.getSets() != null ? prior.getSets() : 1;
            String label = formatTarget(prior.getWeightKg(), prior.getReps(), setCount);
            return new ExercisePreviousPerformanceResponse.Target(
                    prior.getWeightKg(),
                    prior.getReps(),
                    setCount,
                    label
            );
        }

        BigDecimal weight = modeWeight(sets);
        if (weight == null) {
            weight = prior.getWeightKg();
        }
        Integer reps = modeReps(sets);
        if (reps == null) {
            reps = prior.getReps();
        }
        int setCount = sets.size();
        return new ExercisePreviousPerformanceResponse.Target(
                weight,
                reps,
                setCount,
                formatTarget(weight, reps, setCount)
        );
    }

    private static BigDecimal modeWeight(List<ExerciseSet> sets) {
        Map<BigDecimal, Integer> counts = new HashMap<>();
        for (ExerciseSet set : sets) {
            if (set.getWeightKg() == null) {
                continue;
            }
            BigDecimal key = set.getWeightKg().stripTrailingZeros();
            counts.merge(key, 1, Integer::sum);
        }
        return counts.entrySet().stream()
                .max(Comparator.<Map.Entry<BigDecimal, Integer>>comparingInt(Map.Entry::getValue)
                        .thenComparing(Map.Entry::getKey))
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private static Integer modeReps(List<ExerciseSet> sets) {
        Map<Integer, Integer> counts = new HashMap<>();
        for (ExerciseSet set : sets) {
            if (set.getReps() == null) {
                continue;
            }
            counts.merge(set.getReps(), 1, Integer::sum);
        }
        return counts.entrySet().stream()
                .max(Comparator.<Map.Entry<Integer, Integer>>comparingInt(Map.Entry::getValue)
                        .thenComparing(Map.Entry::getKey))
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private static String formatTarget(BigDecimal weightKg, Integer reps, Integer sets) {
        StringBuilder sb = new StringBuilder();
        if (weightKg != null) {
            sb.append(weightKg.stripTrailingZeros().toPlainString()).append(" kg");
        } else {
            sb.append("— kg");
        }
        sb.append(" × ");
        sb.append(reps != null ? reps : "—");
        sb.append(" × ");
        sb.append(sets != null ? sets : "—");
        return sb.toString();
    }

    private WorkoutExercise findOwnedActive(String userId, UUID workoutId, UUID exerciseId) {
        WorkoutExercise exercise = workoutExerciseRepository
                .findByIdAndWorkoutIdAndUserId(exerciseId, workoutId, userId)
                .orElseThrow(() -> new WorkoutExerciseNotFoundException(exerciseId));
        if (exercise.isArchived()) {
            throw new WorkoutBadRequestException("This exercise is archived");
        }
        return exercise;
    }

    private void requireOwnedActiveWorkout(String userId, UUID workoutId) {
        requireOwnedActiveWorkoutEntity(userId, workoutId);
    }

    private Workout requireOwnedActiveWorkoutEntity(String userId, UUID workoutId) {
        Workout workout = workoutRepository
                .findByIdAndUserId(workoutId, userId)
                .orElseThrow(() -> new WorkoutNotFoundException(workoutId));
        if (workout.isArchived()) {
            throw new WorkoutBadRequestException("This workout is archived");
        }
        return workout;
    }

    private void apply(WorkoutExercise exercise, WorkoutExerciseRequest request, Integer sortOrder) {
        exercise.setName(request.name().trim());
        exercise.setSets(request.sets());
        exercise.setReps(request.reps());
        exercise.setWeightKg(request.weightKg());
        exercise.setMaxWeightKg(request.maxWeightKg());
        exercise.setMaxReps(request.maxReps());
        exercise.setNotes(blankToNull(request.notes()));
        exercise.setSortOrder(sortOrder != null ? sortOrder : 0);

        BigDecimal oneRm = request.oneRmKg();
        if (oneRm == null) {
            oneRm = estimateOneRm(request.weightKg(), request.reps());
        }
        exercise.setOneRmKg(oneRm);
    }

    static BigDecimal estimateOneRm(BigDecimal weightKg, Integer reps) {
        if (weightKg == null || reps == null || reps < 1) {
            return null;
        }
        if (reps == 1) {
            return weightKg.setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal factor = BigDecimal.ONE.add(
                BigDecimal.valueOf(reps).divide(BigDecimal.valueOf(30), 6, RoundingMode.HALF_UP)
        );
        return weightKg.multiply(factor).setScale(2, RoundingMode.HALF_UP);
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
