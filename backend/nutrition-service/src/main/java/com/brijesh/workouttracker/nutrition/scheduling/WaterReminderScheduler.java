package com.brijesh.workouttracker.nutrition.scheduling;

import com.brijesh.workouttracker.nutrition.service.WaterReminderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.ZoneId;

@Component
@ConditionalOnProperty(
        prefix = "workout.water-reminders",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true
)
public class WaterReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(WaterReminderScheduler.class);

    private final WaterReminderService waterReminderService;
    private final ZoneId zoneId;

    public WaterReminderScheduler(
            WaterReminderService waterReminderService,
            @Value("${workout.water-reminders.zone:Asia/Kolkata}") String zone
    ) {
        this.waterReminderService = waterReminderService;
        this.zoneId = ZoneId.of(zone);
    }

    /** Top of each hour; service only acts at 10:00, 14:00, 18:00 local. */
    @Scheduled(cron = "${workout.water-reminders.cron:0 0 * * * *}", zone = "${workout.water-reminders.zone:Asia/Kolkata}")
    public void tick() {
        log.debug("Water reminder tick zone={}", zoneId);
        waterReminderService.sendDueReminders(zoneId);
    }
}
