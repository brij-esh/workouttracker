package com.brijesh.workouttracker.notification.service;

import com.brijesh.workouttracker.notification.dto.CreateNotificationRequest;
import com.brijesh.workouttracker.notification.dto.NotificationResponse;
import com.brijesh.workouttracker.notification.dto.PageResponse;
import com.brijesh.workouttracker.notification.dto.UnreadCountResponse;
import com.brijesh.workouttracker.notification.entity.Notification;
import com.brijesh.workouttracker.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final NotificationRepository notificationRepository;
    private final NotificationRecipientService recipientService;

    public PageResponse<NotificationResponse> list(String userId, boolean unreadOnly, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size));
        var result = unreadOnly
                ? notificationRepository.findAllByUserIdAndReadFalseOrderByCreatedAtDesc(userId, pageable)
                : notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId, pageable);

        return PageResponse.from(result.map(NotificationResponse::fromEntity));
    }

    public NotificationResponse get(String userId, UUID id) {
        return NotificationResponse.fromEntity(findOwned(userId, id));
    }

    public UnreadCountResponse unreadCount(String userId) {
        return new UnreadCountResponse(
                notificationRepository.countByUserIdAndReadFalse(userId)
        );
    }

    @Transactional
    public NotificationResponse create(String userId, CreateNotificationRequest request) {
        recipientService.register(userId);

        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(request.type());
        notification.setTitle(request.title());
        notification.setMessage(request.message());
        notification.setReferenceId(request.referenceId());
        notification.setRead(false);

        return NotificationResponse.fromEntity(notificationRepository.save(notification));
    }

    @Transactional
    public NotificationResponse markRead(String userId, UUID id) {
        Notification notification = findOwned(userId, id);
        if (!notification.isRead()) {
            Instant now = Instant.now();
            notification.setRead(true);
            notification.setReadAt(now);
            notification.setUpdatedAt(now);
            notification = notificationRepository.saveAndFlush(notification);
        }
        return NotificationResponse.fromEntity(notification);
    }

    @Transactional
    public UnreadCountResponse markAllRead(String userId) {
        notificationRepository.markAllReadForUser(userId, Instant.now());
        return unreadCount(userId);
    }

    @Transactional
    public void delete(String userId, UUID id) {
        notificationRepository.delete(findOwned(userId, id));
    }

    @Transactional
    public void clearAll(String userId) {
        notificationRepository.deleteAllByUserId(userId);
    }

    private int clampSize(int size) {
        if (size <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private Notification findOwned(String userId, UUID id) {
        return notificationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NotificationNotFoundException(id));
    }
}
