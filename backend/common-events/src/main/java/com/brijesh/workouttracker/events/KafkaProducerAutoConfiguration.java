package com.brijesh.workouttracker.events;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaTemplate;

@AutoConfiguration(after = KafkaAutoConfiguration.class)
@ConditionalOnClass(KafkaTemplate.class)
@EnableConfigurationProperties(KafkaProperties.class)
public class KafkaProducerAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean(DomainEventPublisher.class)
    @ConditionalOnProperty(prefix = "workout.kafka", name = "enabled", havingValue = "true", matchIfMissing = true)
    @ConditionalOnBean(KafkaTemplate.class)
    public DomainEventPublisher kafkaDomainEventPublisher(KafkaTemplate<?, ?> kafkaTemplate) {
        return new KafkaDomainEventPublisher(kafkaTemplate);
    }

    @Bean
    @ConditionalOnMissingBean(DomainEventPublisher.class)
    public DomainEventPublisher noOpDomainEventPublisher() {
        return new NoOpDomainEventPublisher();
    }

    @Bean
    @ConditionalOnProperty(prefix = "workout.kafka", name = "enabled", havingValue = "true", matchIfMissing = true)
    public NewTopic workoutEventsTopic() {
        return TopicBuilder.name(KafkaTopics.WORKOUT_EVENTS).partitions(1).replicas(1).build();
    }

    @Bean
    @ConditionalOnProperty(prefix = "workout.kafka", name = "enabled", havingValue = "true", matchIfMissing = true)
    public NewTopic userEventsTopic() {
        return TopicBuilder.name(KafkaTopics.USER_EVENTS).partitions(1).replicas(1).build();
    }

    @Bean
    @ConditionalOnProperty(prefix = "workout.kafka", name = "enabled", havingValue = "true", matchIfMissing = true)
    public NewTopic progressEventsTopic() {
        return TopicBuilder.name(KafkaTopics.PROGRESS_EVENTS).partitions(1).replicas(1).build();
    }

    @Bean
    @ConditionalOnProperty(prefix = "workout.kafka", name = "enabled", havingValue = "true", matchIfMissing = true)
    public NewTopic nutritionEventsTopic() {
        return TopicBuilder.name(KafkaTopics.NUTRITION_EVENTS).partitions(1).replicas(1).build();
    }
}
