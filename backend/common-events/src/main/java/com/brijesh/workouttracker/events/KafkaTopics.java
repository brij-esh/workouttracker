package com.brijesh.workouttracker.events;

public final class KafkaTopics {

    public static final String WORKOUT_EVENTS = "workout-events";
    public static final String USER_EVENTS = "user-events";
    public static final String PROGRESS_EVENTS = "progress-events";
    public static final String NUTRITION_EVENTS = "nutrition-events";

    private KafkaTopics() {
    }
}
