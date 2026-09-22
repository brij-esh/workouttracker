package com.brijesh.workouttracker.notification.messaging;

import com.brijesh.workouttracker.events.KafkaTopics;
import com.brijesh.workouttracker.events.NutritionEventType;
import com.brijesh.workouttracker.events.NutritionLoggedEvent;
import com.brijesh.workouttracker.events.ProgressUpdatedEvent;
import com.brijesh.workouttracker.events.UserRegisteredEvent;
import com.brijesh.workouttracker.events.WorkoutEventType;
import com.brijesh.workouttracker.events.WorkoutLifecycleEvent;
import com.brijesh.workouttracker.notification.domain.NotificationType;
import com.brijesh.workouttracker.notification.dto.CreateNotificationRequest;
import com.brijesh.workouttracker.notification.repository.NotificationRepository;
import com.brijesh.workouttracker.notification.service.NotificationRecipientService;
import com.brijesh.workouttracker.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "workout.kafka", name = "enabled", havingValue = "true", matchIfMissing = true)
public class DomainEventNotificationListener {

    private static final Logger log = LoggerFactory.getLogger(DomainEventNotificationListener.class);

    private final NotificationService notificationService;
    private final NotificationRecipientService recipientService;
    private final NotificationRepository notificationRepository;

    @KafkaListener(topics = KafkaTopics.WORKOUT_EVENTS, groupId = "notification-service")
    public void onWorkoutEvent(WorkoutLifecycleEvent event) {
        log.info("Received workout event {} for user={}", event.eventType(), event.userId());
        recipientService.register(event.userId());

        String title;
        String message;
        if (event.eventType() == WorkoutEventType.CREATED) {
            title = "Workout logged";
            message = "You logged \"" + event.name() + "\".";
        } else if (event.eventType() == WorkoutEventType.UPDATED) {
            title = "Workout updated";
            message = "Your workout \"" + event.name() + "\" was updated.";
        } else {
            title = "Workout deleted";
            message = "Your workout \"" + event.name() + "\" was deleted.";
        }

        notificationService.create(
                event.userId(),
                new CreateNotificationRequest(
                        NotificationType.WORKOUT_REMINDER,
                        title,
                        message,
                        event.workoutId() != null ? event.workoutId().toString() : null
                )
        );
    }

    @KafkaListener(topics = KafkaTopics.USER_EVENTS, groupId = "notification-service")
    public void onUserRegistered(UserRegisteredEvent event) {
        log.info("Received user registered event for user={}", event.firebaseUid());
        recipientService.register(event.firebaseUid());
        notificationService.create(
                event.firebaseUid(),
                new CreateNotificationRequest(
                        NotificationType.SYSTEM,
                        "Welcome to Workout Tracker",
                        "Hi " + event.displayName() + ", your profile is ready. Let's get started!",
                        event.profileId() != null ? event.profileId().toString() : null
                )
        );
    }

    @KafkaListener(topics = KafkaTopics.PROGRESS_EVENTS, groupId = "notification-service")
    public void onProgressUpdated(ProgressUpdatedEvent event) {
        log.info("Received progress event {} for user={}", event.eventType(), event.userId());
        recipientService.register(event.userId());
        notificationService.create(
                event.userId(),
                new CreateNotificationRequest(
                        NotificationType.PROGRESS_UPDATE,
                        "Progress updated",
                        event.summary(),
                        event.resourceId() != null ? event.resourceId().toString() : null
                )
        );
    }

    @KafkaListener(topics = KafkaTopics.NUTRITION_EVENTS, groupId = "notification-service")
    public void onNutritionLogged(NutritionLoggedEvent event) {
        log.info("Received nutrition event {} for user={}", event.eventType(), event.userId());
        recipientService.register(event.userId());

        if (event.eventType() == NutritionEventType.WATER_REMINDER_DUE) {
            String referenceId = event.referenceId();
            if (referenceId != null
                    && notificationRepository.existsByUserIdAndReferenceId(event.userId(), referenceId)) {
                return;
            }
            notificationService.create(
                    event.userId(),
                    new CreateNotificationRequest(
                            NotificationType.WATER_REMINDER,
                            "Water reminder",
                            event.summary(),
                            referenceId
                    )
            );
            return;
        }

        notificationService.create(
                event.userId(),
                new CreateNotificationRequest(
                        NotificationType.NUTRITION_REMINDER,
                        "Nutrition update",
                        event.summary(),
                        event.resourceId() != null ? event.resourceId().toString() : null
                )
        );
    }
}
