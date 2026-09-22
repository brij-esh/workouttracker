package com.brijesh.workouttracker.workout.service;

import java.util.UUID;

public class WorkoutExerciseNotFoundException extends RuntimeException {

    public WorkoutExerciseNotFoundException(UUID exerciseId) {
        super("Workout exercise not found: " + exerciseId);
    }
}
