package com.brijesh.workouttracker.progress.service;

import com.brijesh.workouttracker.events.DomainEventPublisher;
import com.brijesh.workouttracker.events.KafkaTopics;
import com.brijesh.workouttracker.events.ProgressEventType;
import com.brijesh.workouttracker.events.ProgressUpdatedEvent;
import com.brijesh.workouttracker.progress.dto.BodyWeightProgressResponse;
import com.brijesh.workouttracker.progress.dto.ProgressSummaryResponse;
import com.brijesh.workouttracker.progress.dto.WeightGoalRequest;
import com.brijesh.workouttracker.progress.dto.WeightLogRequest;
import com.brijesh.workouttracker.progress.dto.WeightLogResponse;
import com.brijesh.workouttracker.progress.entity.WeightGoal;
import com.brijesh.workouttracker.progress.entity.WeightLog;
import com.brijesh.workouttracker.progress.repository.BodyMeasurementRepository;
import com.brijesh.workouttracker.progress.repository.PersonalRecordRepository;
import com.brijesh.workouttracker.progress.repository.WeightGoalRepository;
import com.brijesh.workouttracker.progress.repository.WeightLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WeightLogService {

    private final WeightLogRepository weightLogRepository;
    private final WeightGoalRepository weightGoalRepository;
    private final BodyMeasurementRepository bodyMeasurementRepository;
    private final PersonalRecordRepository personalRecordRepository;
    private final DomainEventPublisher domainEventPublisher;

    public List<WeightLogResponse> list(String userId) {
        return weightLogRepository.findAllByUserIdAndArchivedFalseOrderByRecordedOnDesc(userId)
                .stream()
                .map(WeightLogResponse::fromEntity)
                .toList();
    }

    public List<WeightLogResponse> listArchived(String userId) {
        return weightLogRepository.findAllByUserIdAndArchivedTrueOrderByRecordedOnDesc(userId)
                .stream()
                .map(WeightLogResponse::fromEntity)
                .toList();
    }

    public WeightLogResponse get(String userId, UUID id) {
        return WeightLogResponse.fromEntity(findOwned(userId, id));
    }

    @Transactional
    public WeightLogResponse create(String userId, WeightLogRequest request) {
        ProgressEditWindow.requireWithinWindowForMutation(request.recordedOn(), "saved");
        WeightLog entity = new WeightLog();
        entity.setUserId(userId);
        apply(entity, request);
        entity.setArchived(false);
        WeightLog saved = weightLogRepository.save(entity);
        domainEventPublisher.publish(
                KafkaTopics.PROGRESS_EVENTS,
                userId,
                new ProgressUpdatedEvent(
                        ProgressEventType.WEIGHT_LOGGED,
                        saved.getId(),
                        userId,
                        "Weight logged: " + saved.getWeightKg() + " kg",
                        Instant.now()
                )
        );
        return WeightLogResponse.fromEntity(saved);
    }

    @Transactional
    public WeightLogResponse update(String userId, UUID id, WeightLogRequest request) {
        WeightLog entity = findOwnedActive(userId, id);
        ProgressEditWindow.requireWithinWindowForMutation(entity.getRecordedOn(), "edited");
        ProgressEditWindow.requireWithinWindowForMutation(request.recordedOn(), "edited");
        apply(entity, request);
        entity.setUpdatedAt(Instant.now());
        return WeightLogResponse.fromEntity(weightLogRepository.saveAndFlush(entity));
    }

    @Transactional
    public void delete(String userId, UUID id) {
        WeightLog entity = findOwnedActive(userId, id);
        ProgressEditWindow.requireWithinWindowForMutation(entity.getRecordedOn(), "deleted");
        weightLogRepository.delete(entity);
    }

    @Transactional
    public WeightLogResponse archive(String userId, UUID id) {
        WeightLog entity = findOwnedActive(userId, id);
        entity.setArchived(true);
        entity.setUpdatedAt(Instant.now());
        return WeightLogResponse.fromEntity(weightLogRepository.saveAndFlush(entity));
    }

    public ProgressSummaryResponse summary(String userId) {
        var latest = weightLogRepository.findFirstByUserIdAndArchivedFalseOrderByRecordedOnDesc(userId);
        var starting = weightLogRepository.findFirstByUserIdAndArchivedFalseOrderByRecordedOnAsc(userId);

        BigDecimal latestWeight = latest.map(WeightLog::getWeightKg).orElse(null);
        BigDecimal startingWeight = starting.map(WeightLog::getWeightKg).orElse(null);
        BigDecimal change = null;
        if (latestWeight != null && startingWeight != null) {
            change = latestWeight.subtract(startingWeight);
        }

        return new ProgressSummaryResponse(
                weightLogRepository.countByUserIdAndArchivedFalse(userId),
                bodyMeasurementRepository.countByUserId(userId),
                personalRecordRepository.countByUserIdAndArchivedFalse(userId),
                latestWeight,
                latest.map(WeightLog::getRecordedOn).orElse(null),
                startingWeight,
                starting.map(WeightLog::getRecordedOn).orElse(null),
                change
        );
    }

    public BodyWeightProgressResponse bodyWeightProgress(String userId) {
        List<WeightLog> logs = weightLogRepository
                .findAllByUserIdAndArchivedFalseOrderByRecordedOnDesc(userId)
                .stream()
                .sorted(Comparator.comparing(WeightLog::getRecordedOn))
                .toList();

        if (logs.isEmpty()) {
            BigDecimal goal = weightGoalRepository.findById(userId).map(WeightGoal::getGoalKg).orElse(null);
            return new BodyWeightProgressResponse(
                    null, null, null, null, null, null, null, null, null, goal, null,
                    "Log weigh-ins to see body weight progress."
            );
        }

        LocalDate today = ProgressEditWindow.today();
        WeightLog latest = logs.get(logs.size() - 1);
        WeightLog starting = logs.getFirst();

        BigDecimal weeklyAvg = averageInWindow(logs, today.minusDays(6), today);
        BigDecimal monthlyAvg = averageInWindow(logs, today.minusDays(29), today);
        BigDecimal priorWeekAvg = averageInWindow(logs, today.minusDays(13), today.minusDays(7));

        // Smart current: prefer 7-day average so daily noise doesn't drive the headline.
        BigDecimal current = weeklyAvg != null ? weeklyAvg : latest.getWeightKg();
        BigDecimal change = current.subtract(starting.getWeightKg()).setScale(1, RoundingMode.HALF_UP);

        BigDecimal ratePerWeek = null;
        if (weeklyAvg != null && priorWeekAvg != null) {
            ratePerWeek = weeklyAvg.subtract(priorWeekAvg).setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal goal = weightGoalRepository.findById(userId).map(WeightGoal::getGoalKg).orElse(null);
        BigDecimal progressPct = progressTowardGoal(starting.getWeightKg(), current, goal);

        return new BodyWeightProgressResponse(
                latest.getWeightKg(),
                latest.getRecordedOn(),
                weeklyAvg,
                monthlyAvg,
                starting.getWeightKg(),
                starting.getRecordedOn(),
                current.setScale(1, RoundingMode.HALF_UP),
                change,
                ratePerWeek,
                goal,
                progressPct,
                "Current weight uses a 7-day average to smooth daily fluctuations."
        );
    }

    @Transactional
    public BodyWeightProgressResponse upsertGoal(String userId, WeightGoalRequest request) {
        WeightGoal goal = weightGoalRepository.findById(userId).orElseGet(WeightGoal::new);
        goal.setUserId(userId);
        goal.setGoalKg(request.goalWeightKg().setScale(1, RoundingMode.HALF_UP));
        weightGoalRepository.save(goal);
        return bodyWeightProgress(userId);
    }

    private static BigDecimal averageInWindow(List<WeightLog> logs, LocalDate from, LocalDate to) {
        List<BigDecimal> values = logs.stream()
                .filter(l -> !l.getRecordedOn().isBefore(from) && !l.getRecordedOn().isAfter(to))
                .map(WeightLog::getWeightKg)
                .toList();
        if (values.isEmpty()) {
            return null;
        }
        BigDecimal sum = values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(values.size()), 1, RoundingMode.HALF_UP);
    }

    private static BigDecimal progressTowardGoal(BigDecimal start, BigDecimal current, BigDecimal goal) {
        if (start == null || current == null || goal == null) {
            return null;
        }
        BigDecimal span = goal.subtract(start);
        if (span.compareTo(BigDecimal.ZERO) == 0) {
            return current.compareTo(goal) == 0
                    ? BigDecimal.valueOf(100)
                    : BigDecimal.ZERO;
        }
        BigDecimal moved = current.subtract(start);
        BigDecimal pct = moved
                .multiply(BigDecimal.valueOf(100))
                .divide(span, 1, RoundingMode.HALF_UP);
        if (pct.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO;
        }
        if (pct.compareTo(BigDecimal.valueOf(100)) > 0) {
            return BigDecimal.valueOf(100);
        }
        return pct;
    }

    private WeightLog findOwned(String userId, UUID id) {
        return weightLogRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ProgressResourceNotFoundException("Weight log", id));
    }

    private WeightLog findOwnedActive(String userId, UUID id) {
        WeightLog entity = findOwned(userId, id);
        if (entity.isArchived()) {
            throw new ProgressBadRequestException("This weight log is archived");
        }
        return entity;
    }

    private void apply(WeightLog entity, WeightLogRequest request) {
        entity.setRecordedOn(request.recordedOn());
        entity.setWeightKg(request.weightKg());
        entity.setNotes(request.notes());
    }
}
