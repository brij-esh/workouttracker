package com.brijesh.workouttracker.user.service;

public class UserAlreadyExistsException extends RuntimeException {

    public UserAlreadyExistsException(String firebaseUid) {
        super("User profile already exists for firebaseUid: " + firebaseUid);
    }
}
