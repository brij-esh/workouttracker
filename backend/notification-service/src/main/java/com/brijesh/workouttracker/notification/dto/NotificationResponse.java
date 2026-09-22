package com.brijesh.workouttracker.notification.dto;

import com.brijesh.workouttracker.notification.domain.NotificationType;
import com.brijesh.workouttracker.notification.entity.Notification;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        String userId,
        NotificationType type,
        String title,
        String message,
        boolean read,
        String referenceId,
        Instant createdAt,
        Instant updatedAt,
        Instant readAt
) {

    public static NotificationResponse fromEntity(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getUserId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.isRead(),
                notification.getReferenceId(),
                notification.getCreatedAt(),
                notification.getUpdatedAt(),
                notification.getReadAt()
        );
    }
}
