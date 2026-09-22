package com.brijesh.workouttracker.workout.service;

public class WorkoutBadRequestException extends RuntimeException {

    public WorkoutBadRequestException(String message) {
        super(message);
    }
}
