package com.brijesh.workouttracker.notification.service;

import com.brijesh.workouttracker.notification.domain.NotificationType;
import com.brijesh.workouttracker.notification.dto.CreateNotificationRequest;
import com.brijesh.workouttracker.notification.entity.Notification;
import com.brijesh.workouttracker.notification.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private NotificationRecipientService recipientService;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void shouldCreateNotification() {
        String userId = "firebase-user-1";
        CreateNotificationRequest request = new CreateNotificationRequest(
                NotificationType.WORKOUT_REMINDER,
                "Time to train",
                "Your Push Day workout is scheduled for today.",
                "workout-123"
        );

        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification notification = invocation.getArgument(0);
            notification.setId(UUID.randomUUID());
            return notification;
        });

        var response = notificationService.create(userId, request);

        assertEquals(NotificationType.WORKOUT_REMINDER, response.type());
        assertEquals("Time to train", response.title());
        assertEquals(false, response.read());
    }

    @Test
    void shouldMarkNotificationAsRead() {
        UUID id = UUID.randomUUID();
        String userId = "firebase-user-1";

        Notification notification = new Notification();
        notification.setId(id);
        notification.setUserId(userId);
        notification.setType(NotificationType.GENERAL);
        notification.setTitle("Hello");
        notification.setMessage("World");
        notification.setRead(false);

        when(notificationRepository.findByIdAndUserId(id, userId))
                .thenReturn(Optional.of(notification));
        when(notificationRepository.saveAndFlush(notification)).thenReturn(notification);

        var response = notificationService.markRead(userId, id);

        assertTrue(response.read());
        verify(notificationRepository).saveAndFlush(notification);
    }

    @Test
    void shouldRejectAccessToOtherUsersNotification() {
        UUID id = UUID.randomUUID();
        when(notificationRepository.findByIdAndUserId(id, "other-user"))
                .thenReturn(Optional.empty());

        assertThrows(
                NotificationNotFoundException.class,
                () -> notificationService.get("other-user", id)
        );
    }
}
