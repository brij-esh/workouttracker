package com.brijesh.workouttracker.notification.dto;

import com.brijesh.workouttracker.notification.domain.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateNotificationRequest(

        @NotNull(message = "Notification type is required")
        NotificationType type,

        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title must not exceed 200 characters")
        String title,

        @NotBlank(message = "Message is required")
        @Size(max = 1000, message = "Message must not exceed 1000 characters")
        String message,

        @Size(max = 128, message = "Reference id must not exceed 128 characters")
        String referenceId
) {
}
