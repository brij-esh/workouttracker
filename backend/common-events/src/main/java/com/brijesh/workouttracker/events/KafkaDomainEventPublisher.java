package com.brijesh.workouttracker.events;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;

@SuppressWarnings({"rawtypes", "unchecked"})
public class KafkaDomainEventPublisher implements DomainEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(KafkaDomainEventPublisher.class);

    private final KafkaTemplate kafkaTemplate;

    public KafkaDomainEventPublisher(KafkaTemplate kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @Override
    public void publish(String topic, String key, Object event) {
        try {
            kafkaTemplate.send(topic, key, event);
            log.info("Published {} to topic={} key={}", event.getClass().getSimpleName(), topic, key);
        } catch (Exception exception) {
            log.warn(
                    "Failed to publish {} to topic={} key={}: {}",
                    event.getClass().getSimpleName(),
                    topic,
                    key,
                    exception.getMessage()
            );
        }
    }
}
