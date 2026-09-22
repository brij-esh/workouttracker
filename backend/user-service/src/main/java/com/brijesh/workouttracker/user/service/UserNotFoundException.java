package com.brijesh.workouttracker.user.service;

public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(String firebaseUid) {
        super("User profile not found for firebaseUid: " + firebaseUid);
    }
}
