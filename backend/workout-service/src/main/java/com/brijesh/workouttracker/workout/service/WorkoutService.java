package com.brijesh.workouttracker.workout.service;

import com.brijesh.workouttracker.events.DomainEventPublisher;
import com.brijesh.workouttracker.events.KafkaTopics;
import com.brijesh.workouttracker.events.WorkoutEventType;
import com.brijesh.workouttracker.events.WorkoutLifecycleEvent;
import com.brijesh.workouttracker.workout.dto.CompleteWorkoutRequest;
import com.brijesh.workouttracker.workout.dto.CreateWorkoutRequest;
import com.brijesh.workouttracker.workout.dto.PageResponse;
import com.brijesh.workouttracker.workout.dto.PauseWorkoutRequest;
import com.brijesh.workouttracker.workout.dto.UpdateWorkoutRequest;
import com.brijesh.workouttracker.workout.dto.WorkoutResponse;
import com.brijesh.workouttracker.workout.entity.Workout;
import com.brijesh.workouttracker.workout.entity.WorkoutStatus;
import com.brijesh.workouttracker.workout.repository.WorkoutRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkoutService {

    private final WorkoutRepository workoutRepository;
    private final DomainEventPublisher domainEventPublisher;

    public List<WorkoutResponse> getMyWorkouts(String userId) {
        return workoutRepository
                .findAllByUserIdAndArchivedFalseOrderByWorkoutDateDesc(userId)
                .stream()
                .map(this::toResponseRefreshing)
                .toList();
    }

    public PageResponse<WorkoutResponse> getMyWorkoutsPage(String userId, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(50, Math.max(1, size));
        var result = workoutRepository
                .findAllByUserIdAndArchivedFalseOrderByWorkoutDateDesc(
                        userId,
                        PageRequest.of(safePage, safeSize)
                )
                .map(this::toResponseRefreshing);
        return PageResponse.from(result);
    }

    public List<WorkoutResponse> getArchivedWorkouts(String userId) {
        return workoutRepository
                .findAllByUserIdAndArchivedTrueOrderByWorkoutDateDesc(userId)
                .stream()
                .map(WorkoutResponse::fromEntity)
                .toList();
    }

    public WorkoutResponse getMyWorkout(String userId, UUID workoutId) {
        return toResponseRefreshing(findOwned(userId, workoutId));
    }

    @Transactional
    public WorkoutResponse createWorkout(String userId, CreateWorkoutRequest request) {
        boolean live = Boolean.TRUE.equals(request.liveSession());
        Instant now = Instant.now();

        Workout workout = new Workout();
        workout.setUserId(userId);
        workout.setName(request.name());
        workout.setDescription(request.description());
        workout.setWorkoutDate(request.workoutDate());
        workout.setDurationMinutes(request.durationMinutes());
        workout.setCaloriesBurned(request.caloriesBurned());
        workout.setArchived(false);
        workout.setElapsedMs(0L);

        if (live) {
            workout.setStatus(WorkoutStatus.IN_PROGRESS);
            workout.setSessionStartedAt(now);
            workout.setCompletedAt(null);
            workout.setPausedAt(null);
        } else {
            workout.setStatus(WorkoutStatus.COMPLETED);
            workout.setCompletedAt(now);
            if (workout.getSessionStartedAt() == null) {
                workout.setSessionStartedAt(now);
            }
        }

        Workout savedWorkout = workoutRepository.save(workout);
        publish(WorkoutEventType.CREATED, savedWorkout);
        return WorkoutResponse.fromEntity(savedWorkout);
    }

    @Transactional
    public void deleteWorkout(String userId, UUID workoutId) {
        Workout workout = findOwnedActive(userId, workoutId);
        WorkoutSessionRules.requireEditable(workout, "deleted");
        workoutRepository.delete(workout);
        publish(WorkoutEventType.DELETED, workout);
    }

    @Transactional
    public WorkoutResponse archiveWorkout(String userId, UUID workoutId) {
        Workout workout = findOwnedActive(userId, workoutId);
        workout.setArchived(true);
        workout.setUpdatedAt(Instant.now());
        Workout saved = workoutRepository.save(workout);
        publish(WorkoutEventType.UPDATED, saved);
        return WorkoutResponse.fromEntity(saved);
    }

    @Transactional
    public WorkoutResponse updateWorkout(
            UUID workoutId,
            String userId,
            UpdateWorkoutRequest request
    ) {
        Workout workout = findOwnedActive(userId, workoutId);
        refreshExpiry(workout);
        WorkoutSessionRules.requireEditable(workout, "edited");

        workout.setName(request.name());
        workout.setDescription(request.description());
        workout.setWorkoutDate(request.workoutDate());
        workout.setDurationMinutes(request.durationMinutes());
        workout.setCaloriesBurned(request.caloriesBurned());

        Workout updatedWorkout = workoutRepository.save(workout);
        publish(WorkoutEventType.UPDATED, updatedWorkout);
        return WorkoutResponse.fromEntity(updatedWorkout);
    }

    @Transactional
    public WorkoutResponse pauseSession(String userId, UUID workoutId, PauseWorkoutRequest request) {
        Workout workout = findOwnedActive(userId, workoutId);
        refreshExpiry(workout);

        if (workout.getStatus() == WorkoutStatus.COMPLETED) {
            throw new WorkoutBadRequestException("This workout is already completed");
        }
        if (workout.getStatus() == WorkoutStatus.PAUSED) {
            return WorkoutResponse.fromEntity(workout);
        }

        Instant now = Instant.now();
        if (workout.getSessionStartedAt() == null) {
            workout.setSessionStartedAt(now);
        }
        workout.setStatus(WorkoutStatus.PAUSED);
        workout.setPausedAt(now);
        if (request != null && request.elapsedMs() != null) {
            workout.setElapsedMs(Math.max(0, request.elapsedMs()));
        }

        Workout saved = workoutRepository.save(workout);
        publish(WorkoutEventType.UPDATED, saved);
        return WorkoutResponse.fromEntity(saved);
    }

    @Transactional
    public WorkoutResponse resumeSession(String userId, UUID workoutId) {
        Workout workout = findOwnedActive(userId, workoutId);
        refreshExpiry(workout);

        if (workout.getStatus() == WorkoutStatus.COMPLETED) {
            throw new WorkoutBadRequestException(
                    "This workout is completed and can no longer be resumed"
            );
        }
        if (workout.getStatus() == WorkoutStatus.IN_PROGRESS) {
            return WorkoutResponse.fromEntity(workout);
        }
        if (!WorkoutSessionRules.canResume(workout)) {
            Workout saved = workoutRepository.save(workout);
            publish(WorkoutEventType.UPDATED, saved);
            throw new WorkoutBadRequestException(
                    "Paused sessions can only be resumed within 1 hour; this workout is now completed"
            );
        }

        workout.setStatus(WorkoutStatus.IN_PROGRESS);
        workout.setPausedAt(null);
        Workout saved = workoutRepository.save(workout);
        publish(WorkoutEventType.UPDATED, saved);
        return WorkoutResponse.fromEntity(saved);
    }

    @Transactional
    public WorkoutResponse completeSession(
            String userId,
            UUID workoutId,
            CompleteWorkoutRequest request
    ) {
        Workout workout = findOwnedActive(userId, workoutId);
        refreshExpiry(workout);

        if (workout.getStatus() == WorkoutStatus.COMPLETED) {
            // Allow updating duration/calories on an already-completed session within edit window
            WorkoutSessionRules.requireEditable(workout, "edited");
            if (request.durationMinutes() != null) {
                workout.setDurationMinutes(request.durationMinutes());
            }
            if (request.caloriesBurned() != null) {
                workout.setCaloriesBurned(request.caloriesBurned());
            }
            if (request.elapsedMs() != null) {
                workout.setElapsedMs(Math.max(0, request.elapsedMs()));
            }
            Workout saved = workoutRepository.save(workout);
            publish(WorkoutEventType.UPDATED, saved);
            return WorkoutResponse.fromEntity(saved);
        }

        WorkoutSessionRules.markCompleted(
                workout,
                request.durationMinutes(),
                request.caloriesBurned(),
                request.elapsedMs()
        );
        Workout saved = workoutRepository.save(workout);
        publish(WorkoutEventType.UPDATED, saved);
        return WorkoutResponse.fromEntity(saved);
    }

    private WorkoutResponse toResponseRefreshing(Workout workout) {
        if (refreshExpiry(workout)) {
            workout = workoutRepository.save(workout);
            publish(WorkoutEventType.UPDATED, workout);
        }
        return WorkoutResponse.fromEntity(workout);
    }

    private boolean refreshExpiry(Workout workout) {
        if (WorkoutSessionRules.expirePausedIfNeeded(workout)) {
            workout.setUpdatedAt(Instant.now());
            return true;
        }
        return false;
    }

    private Workout findOwned(String userId, UUID workoutId) {
        return workoutRepository
                .findByIdAndUserId(workoutId, userId)
                .orElseThrow(() -> new WorkoutNotFoundException(workoutId));
    }

    private Workout findOwnedActive(String userId, UUID workoutId) {
        Workout workout = findOwned(userId, workoutId);
        if (workout.isArchived()) {
            throw new WorkoutBadRequestException("This workout is archived");
        }
        return workout;
    }

    private void publish(WorkoutEventType eventType, Workout workout) {
        domainEventPublisher.publish(
                KafkaTopics.WORKOUT_EVENTS,
                workout.getUserId(),
                new WorkoutLifecycleEvent(
                        eventType,
                        workout.getId(),
                        workout.getUserId(),
                        workout.getName(),
                        workout.getWorkoutDate(),
                        workout.getDurationMinutes(),
                        workout.getCaloriesBurned(),
                        Instant.now()
                )
        );
    }
}
