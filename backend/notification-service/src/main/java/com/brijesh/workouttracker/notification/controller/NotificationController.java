package com.brijesh.workouttracker.notification.controller;

import com.brijesh.workouttracker.notification.dto.CreateNotificationRequest;
import com.brijesh.workouttracker.notification.dto.NotificationResponse;
import com.brijesh.workouttracker.notification.dto.PageResponse;
import com.brijesh.workouttracker.notification.dto.UnreadCountResponse;
import com.brijesh.workouttracker.notification.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<PageResponse<NotificationResponse>> list(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(notificationService.list(userId, unreadOnly, page, size));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> unreadCount(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(notificationService.unreadCount(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificationResponse> get(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(notificationService.get(userId, id));
    }

    @PostMapping
    public ResponseEntity<NotificationResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody CreateNotificationRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(notificationService.create(userId, request));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markRead(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(notificationService.markRead(userId, id));
    }

    @PostMapping("/read-all")
    public ResponseEntity<UnreadCountResponse> markAllRead(
            @RequestHeader("X-User-Id") String userId
    ) {
        return ResponseEntity.ok(notificationService.markAllRead(userId));
    }

    @DeleteMapping("/all")
    public ResponseEntity<Void> clearAll(
            @RequestHeader("X-User-Id") String userId
    ) {
        notificationService.clearAll(userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id
    ) {
        notificationService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
