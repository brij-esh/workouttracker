package com.brijesh.workouttracker.gateway.security;

public class InvalidFirebaseTokenException extends RuntimeException {

    public InvalidFirebaseTokenException(String message, Throwable cause) {
        super(message, cause);
    }
}