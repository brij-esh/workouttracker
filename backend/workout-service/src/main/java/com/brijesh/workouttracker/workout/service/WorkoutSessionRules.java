package com.brijesh.workouttracker.workout.service;

import com.brijesh.workouttracker.workout.entity.Workout;
import com.brijesh.workouttracker.workout.entity.WorkoutStatus;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

final class WorkoutSessionRules {

    static final int EDIT_WINDOW_DAYS = 5;
    static final Duration RESUME_WINDOW = Duration.ofHours(1);

    private WorkoutSessionRules() {
    }

    /** If paused longer than 1 hour, mark completed in-memory (caller must save). */
    static boolean expirePausedIfNeeded(Workout workout) {
        if (workout.getStatus() != WorkoutStatus.PAUSED || workout.getPausedAt() == null) {
            return false;
        }
        if (Duration.between(workout.getPausedAt(), Instant.now()).compareTo(RESUME_WINDOW) <= 0) {
            return false;
        }
        markCompleted(workout, null, null, workout.getElapsedMs());
        return true;
    }

    static void markCompleted(
            Workout workout,
            Integer durationMinutes,
            Integer caloriesBurned,
            Long elapsedMs
    ) {
        workout.setStatus(WorkoutStatus.COMPLETED);
        workout.setPausedAt(null);
        workout.setCompletedAt(Instant.now());
        if (elapsedMs != null) {
            workout.setElapsedMs(Math.max(0, elapsedMs));
        }
        if (durationMinutes != null) {
            workout.setDurationMinutes(durationMinutes);
        } else if (workout.getDurationMinutes() == null && workout.getElapsedMs() != null && workout.getElapsedMs() > 0) {
            long minutes = Math.max(1, Math.round(workout.getElapsedMs() / 60_000.0));
            workout.setDurationMinutes((int) minutes);
        }
        if (caloriesBurned != null) {
            workout.setCaloriesBurned(caloriesBurned);
        }
    }

    static boolean canResume(Workout workout) {
        expirePausedIfNeeded(workout);
        return workout.getStatus() == WorkoutStatus.PAUSED
                && workout.getPausedAt() != null
                && Duration.between(workout.getPausedAt(), Instant.now()).compareTo(RESUME_WINDOW) <= 0;
    }

    /**
     * Live / paused sessions are always editable.
     * Completed sessions are editable only within 5 days of session start.
     */
    static void requireEditable(Workout workout, String action) {
        expirePausedIfNeeded(workout);
        WorkoutStatus status = workout.getStatus() != null ? workout.getStatus() : WorkoutStatus.COMPLETED;
        if (status == WorkoutStatus.IN_PROGRESS || status == WorkoutStatus.PAUSED) {
            return;
        }
        LocalDate start = sessionStartDate(workout);
        long age = ChronoUnit.DAYS.between(start, LocalDate.now());
        if (age < 0) {
            throw new WorkoutBadRequestException("Future dates are not allowed");
        }
        if (age > EDIT_WINDOW_DAYS) {
            throw new WorkoutBadRequestException(
                    "Completed workouts older than " + EDIT_WINDOW_DAYS
                            + " days cannot be " + action + "; archive instead"
            );
        }
    }

    static LocalDate sessionStartDate(Workout workout) {
        if (workout.getSessionStartedAt() != null) {
            return LocalDate.ofInstant(workout.getSessionStartedAt(), ZoneId.systemDefault());
        }
        if (workout.getCreatedAt() != null) {
            return LocalDate.ofInstant(workout.getCreatedAt(), ZoneId.systemDefault());
        }
        return workout.getWorkoutDate();
    }
}
