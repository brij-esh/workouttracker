package com.brijesh.workouttracker.progress.service;

import com.brijesh.workouttracker.security.RequestClock;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

final class ProgressEditWindow {

    static final int DAYS = 5;

    private ProgressEditWindow() {
    }

    static LocalDate today() {
        return RequestClock.today();
    }

    static long ageInDays(LocalDate recordedOn) {
        return ChronoUnit.DAYS.between(recordedOn, today());
    }

    static boolean isWithinWindow(LocalDate recordedOn) {
        long age = ageInDays(recordedOn);
        return age >= 0 && age <= DAYS;
    }

    static void requireWithinWindowForMutation(LocalDate recordedOn, String action) {
        long age = ageInDays(recordedOn);
        if (age < 0) {
            throw new ProgressBadRequestException("Future dates are not allowed");
        }
        if (age > DAYS) {
            throw new ProgressBadRequestException(
                    "Entries older than " + DAYS + " days cannot be " + action + "; archive instead"
            );
        }
    }
}
