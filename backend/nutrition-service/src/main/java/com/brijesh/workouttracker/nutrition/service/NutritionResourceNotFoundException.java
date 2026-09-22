package com.brijesh.workouttracker.nutrition.service;

import java.util.UUID;

public class NutritionResourceNotFoundException extends RuntimeException {

    public NutritionResourceNotFoundException(String resource, UUID id) {
        super(resource + " not found: " + id);
    }

    public NutritionResourceNotFoundException(String message) {
        super(message);
    }
}
