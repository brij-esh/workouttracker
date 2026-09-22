package com.brijesh.workouttracker.nutrition.service;

import com.brijesh.workouttracker.events.DomainEventPublisher;
import com.brijesh.workouttracker.events.KafkaTopics;
import com.brijesh.workouttracker.events.NutritionEventType;
import com.brijesh.workouttracker.events.NutritionLoggedEvent;
import com.brijesh.workouttracker.nutrition.entity.NutritionTarget;
import com.brijesh.workouttracker.nutrition.repository.NutritionTargetRepository;
import com.brijesh.workouttracker.nutrition.repository.WaterLogRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WaterReminderService {

    private static final Logger log = LoggerFactory.getLogger(WaterReminderService.class);

    private final NutritionTargetRepository nutritionTargetRepository;
    private final WaterLogRepository waterLogRepository;
    private final DomainEventPublisher domainEventPublisher;

    @Transactional(readOnly = true)
    public int sendDueReminders(ZoneId zoneId) {
        LocalTime now = LocalTime.now(zoneId);
        String slot = resolveSlot(now);
        if (slot == null) {
            return 0;
        }

        LocalDate today = LocalDate.now(zoneId);
        List<NutritionTarget> targets = nutritionTargetRepository.findAllByWaterRemindersEnabledTrue();
        if (targets.isEmpty()) {
            log.info("Water reminder job skipped — no users with reminders enabled");
            return 0;
        }

        int published = 0;
        for (NutritionTarget target : targets) {
            int logged = java.util.Optional
                    .ofNullable(waterLogRepository.sumAmountMlByUserIdAndLoggedOn(target.getUserId(), today))
                    .orElse(0);
            int goal = target.getWaterMlTarget() != null ? target.getWaterMlTarget() : 2500;
            if (logged >= goal) {
                continue;
            }

            int remaining = Math.max(0, goal - logged);
            String referenceId = "water-reminder-" + today + "-" + slot;
            String summary = "Hydration check: " + logged + " / " + goal + " ml so far. About "
                    + remaining + " ml left for today — time for a sip.";

            domainEventPublisher.publish(
                    KafkaTopics.NUTRITION_EVENTS,
                    target.getUserId(),
                    new NutritionLoggedEvent(
                            NutritionEventType.WATER_REMINDER_DUE,
                            null,
                            target.getUserId(),
                            today,
                            summary,
                            Instant.now(),
                            referenceId
                    )
            );
            published++;
        }

        log.info(
                "Water reminder job finished day={} slot={} candidates={} published={}",
                today,
                slot,
                targets.size(),
                published
        );
        return published;
    }

    /** Morning / afternoon / evening windows (local hour). */
    static String resolveSlot(LocalTime now) {
        int hour = now.getHour();
        if (hour == 10) {
            return "morning";
        }
        if (hour == 14) {
            return "afternoon";
        }
        if (hour == 18) {
            return "evening";
        }
        return null;
    }
}
