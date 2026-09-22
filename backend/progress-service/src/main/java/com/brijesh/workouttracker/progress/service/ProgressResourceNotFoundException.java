package com.brijesh.workouttracker.progress.service;

import java.util.UUID;

public class ProgressResourceNotFoundException extends RuntimeException {

    public ProgressResourceNotFoundException(String resource, UUID id) {
        super(resource + " not found: " + id);
    }
}
