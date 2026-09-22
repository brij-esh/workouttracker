package com.brijesh.workouttracker.workout.service;

import java.util.UUID;

public class WorkoutNotFoundException extends RuntimeException {

    public WorkoutNotFoundException(UUID workoutId) {
        super("Workout not found: " + workoutId);
    }
}