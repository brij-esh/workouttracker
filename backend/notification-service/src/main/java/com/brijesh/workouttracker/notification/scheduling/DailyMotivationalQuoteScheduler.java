package com.brijesh.workouttracker.notification.scheduling;

import com.brijesh.workouttracker.notification.service.DailyMotivationalQuoteService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.ZoneId;

@Component
@ConditionalOnProperty(
        prefix = "workout.quotes",
        name = "daily-enabled",
        havingValue = "true",
        matchIfMissing = true
)
public class DailyMotivationalQuoteScheduler {

    private static final Logger log = LoggerFactory.getLogger(DailyMotivationalQuoteScheduler.class);

    private final DailyMotivationalQuoteService dailyMotivationalQuoteService;
    private final ZoneId zoneId;

    public DailyMotivationalQuoteScheduler(
            DailyMotivationalQuoteService dailyMotivationalQuoteService,
            @Value("${workout.quotes.zone:Asia/Kolkata}") String zone
    ) {
        this.dailyMotivationalQuoteService = dailyMotivationalQuoteService;
        this.zoneId = ZoneId.of(zone);
    }

    /** Every day at 06:00 in configured timezone (default Asia/Kolkata). */
    @Scheduled(cron = "${workout.quotes.cron:0 0 6 * * *}", zone = "${workout.quotes.zone:Asia/Kolkata}")
    public void sendMorningQuotes() {
        log.info("Running daily motivational quote job zone={}", zoneId);
        dailyMotivationalQuoteService.sendDailyQuotes(zoneId);
    }
}
