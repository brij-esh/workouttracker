package com.brijesh.workouttracker.workout.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class OneRmCalculator {

    private OneRmCalculator() {
    }

    /** Epley: weight * (1 + reps / 30). */
    public static BigDecimal estimate(BigDecimal weightKg, Integer reps) {
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
}
