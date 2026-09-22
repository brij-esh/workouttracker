package com.brijesh.workouttracker.events;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class NoOpDomainEventPublisher implements DomainEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(NoOpDomainEventPublisher.class);

    @Override
    public void publish(String topic, String key, Object event) {
        log.info(
                "Kafka publisher inactive; skipped {} topic={} key={}",
                event.getClass().getSimpleName(),
                topic,
                key
        );
    }
}
