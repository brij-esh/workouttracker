package com.brijesh.workouttracker.notification.service;

import com.brijesh.workouttracker.notification.domain.NotificationType;
import com.brijesh.workouttracker.notification.dto.CreateNotificationRequest;
import com.brijesh.workouttracker.notification.quote.MotivationalQuote;
import com.brijesh.workouttracker.notification.quote.MotivationalQuoteClient;
import com.brijesh.workouttracker.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DailyMotivationalQuoteService {

    private static final Logger log = LoggerFactory.getLogger(DailyMotivationalQuoteService.class);
    private static final int MAX_MESSAGE_LENGTH = 1000;

    private final MotivationalQuoteClient quoteClient;
    private final NotificationRecipientService recipientService;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;

    @Transactional
    public int sendDailyQuotes(ZoneId zoneId) {
        List<String> userIds = recipientService.allUserIds();
        if (userIds.isEmpty()) {
            log.info("Daily quote job skipped — no notification recipients yet");
            return 0;
        }

        MotivationalQuote quote = quoteClient.fetchQuote();
        String dayKey = LocalDate.now(zoneId).toString();
        String referenceId = "daily-quote-" + dayKey;
        String title = "Morning motivation";
        String message = buildMessage(quote);

        int created = 0;
        for (String userId : userIds) {
            if (notificationRepository.existsByUserIdAndReferenceId(userId, referenceId)) {
                continue;
            }
            notificationService.create(
                    userId,
                    new CreateNotificationRequest(
                            NotificationType.MOTIVATIONAL_QUOTE,
                            title,
                            message,
                            referenceId
                    )
            );
            created++;
        }

        log.info(
                "Daily quote job finished day={} recipients={} created={} author={}",
                dayKey,
                userIds.size(),
                created,
                quote.author()
        );
        return created;
    }

    private static String buildMessage(MotivationalQuote quote) {
        String raw = "\"" + quote.text() + "\" — " + quote.author();
        if (raw.length() <= MAX_MESSAGE_LENGTH) {
            return raw;
        }
        return raw.substring(0, MAX_MESSAGE_LENGTH - 1) + "…";
    }
}
