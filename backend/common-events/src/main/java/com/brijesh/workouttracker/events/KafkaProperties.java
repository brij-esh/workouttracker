package com.brijesh.workouttracker.events;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "workout.kafka")
public class KafkaProperties {

    /**
     * When false, DomainEventPublisher becomes a no-op (useful for tests / offline).
     */
    private boolean enabled = true;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}
