package com.brijesh.workouttracker.workout.service;

import com.brijesh.workouttracker.security.RequestClock;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

final class WorkoutEditWindow {

    static final int DAYS = 5;

    private WorkoutEditWindow() {
    }

    static void requireWithinWindow(LocalDate recordedOn, String action) {
        long age = ChronoUnit.DAYS.between(recordedOn, RequestClock.today());
        if (age < 0) {
            throw new WorkoutBadRequestException("Future dates are not allowed");
        }
        if (age > DAYS) {
            throw new WorkoutBadRequestException(
                    "Entries older than " + DAYS + " days cannot be " + action + "; archive instead"
            );
        }
    }

    static void requireWithinWindow(Instant createdAt, String action) {
        LocalDate recordedOn = LocalDate.ofInstant(createdAt, RequestClock.zone());
        requireWithinWindow(recordedOn, action);
    }
}
