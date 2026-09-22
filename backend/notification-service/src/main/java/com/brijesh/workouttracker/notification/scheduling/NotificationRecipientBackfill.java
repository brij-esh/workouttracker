package com.brijesh.workouttracker.notification.scheduling;

import com.brijesh.workouttracker.notification.repository.NotificationRepository;
import com.brijesh.workouttracker.notification.service.NotificationRecipientService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds quote recipients from users who already have notifications
 * (covers accounts created before the recipients table existed).
 */
@Component
@RequiredArgsConstructor
public class NotificationRecipientBackfill implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(NotificationRecipientBackfill.class);

    private final NotificationRepository notificationRepository;
    private final NotificationRecipientService recipientService;

    @Override
    public void run(ApplicationArguments args) {
        var userIds = notificationRepository.findDistinctUserIds();
        for (String userId : userIds) {
            recipientService.register(userId);
        }
        log.info("Backfilled {} notification recipient(s) from existing notifications", userIds.size());
    }
}
