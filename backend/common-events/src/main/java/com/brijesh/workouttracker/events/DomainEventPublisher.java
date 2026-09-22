package com.brijesh.workouttracker.events;

public interface DomainEventPublisher {

    void publish(String topic, String key, Object event);
}
