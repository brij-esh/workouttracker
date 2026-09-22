package com.brijesh.workouttracker.workout.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ExercisePreviousPerformanceResponse(
        boolean found,
        UUID previousExerciseId,
        UUID previousWorkoutId,
        String previousWorkoutName,
        LocalDate workoutDate,
        List<PreviousSet> sets,
        Target target
) {

    public static ExercisePreviousPerformanceResponse empty() {
        return new ExercisePreviousPerformanceResponse(
                false,
                null,
                null,
                null,
                null,
                List.of(),
                null
        );
    }

    public record PreviousSet(
            Integer setNumber,
            Integer reps,
            BigDecimal weightKg,
            boolean completed
    ) {
    }

    public record Target(
            BigDecimal weightKg,
            Integer reps,
            Integer sets,
            String label
    ) {
    }
}
