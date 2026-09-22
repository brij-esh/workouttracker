package com.brijesh.workouttracker.workout.dto;

import java.time.LocalDate;
import java.util.List;

public record WorkoutConsistencyResponse(
        String month,
        String monthLabel,
        String planName,
        int completed,
        int planned,
        int missed,
        int consistencyPercent,
        int workoutsThisWeek,
        int workoutsThisMonth,
        int currentStreak,
        double averageWorkoutsPerWeek,
        double trainingFrequency,
        List<HeatmapRow> heatmap
) {

    public record HeatmapRow(
            String weekday,
            List<HeatmapCell> cells
    ) {
    }

    public record HeatmapCell(
            LocalDate date,
            int level,
            int workoutCount,
            boolean planned,
            boolean missed
    ) {
    }
}
