package com.brijesh.workouttracker.workout.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CalendarResponse(
        LocalDate from,
        LocalDate to,
        int workoutCount,
        int currentStreak,
        List<CalendarDay> days
) {

    public record CalendarDay(
            LocalDate date,
            int workoutCount,
            List<CalendarWorkout> workouts
    ) {
    }

    public record CalendarWorkout(
            UUID id,
            String name,
            Integer durationMinutes,
            Integer caloriesBurned
    ) {
    }
}
