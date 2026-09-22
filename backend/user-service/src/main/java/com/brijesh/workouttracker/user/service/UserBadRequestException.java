package com.brijesh.workouttracker.user.service;

public class UserBadRequestException extends RuntimeException {

    public UserBadRequestException(String message) {
        super(message);
    }
}
