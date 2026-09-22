package com.brijesh.workouttracker.progress.service;

import com.brijesh.workouttracker.progress.domain.StepSource;
import com.brijesh.workouttracker.progress.dto.StepLogRequest;
import com.brijesh.workouttracker.progress.dto.StepLogResponse;
import com.brijesh.workouttracker.progress.entity.StepLog;
import com.brijesh.workouttracker.progress.repository.StepLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StepLogService {

    private static final BigDecimal DEFAULT_WEIGHT_KG = BigDecimal.valueOf(70);

    private final StepLogRepository stepLogRepository;

    public List<StepLogResponse> list(String userId, LocalDate from, LocalDate to) {
        LocalDate end = to != null ? to : LocalDate.now();
        LocalDate start = from != null ? from : end.minusDays(29);
        if (start.isAfter(end)) {
            LocalDate swap = start;
            start = end;
            end = swap;
        }
        return stepLogRepository
                .findAllByUserIdAndRecordedOnBetweenOrderByRecordedOnDesc(userId, start, end)
                .stream()
                .map(StepLogResponse::fromEntity)
                .toList();
    }

    public StepLogResponse getForDate(String userId, LocalDate date) {
        return stepLogRepository.findByUserIdAndRecordedOn(userId, date)
                .map(StepLogResponse::fromEntity)
                .orElse(null);
    }

    @Transactional
    public StepLogResponse upsert(String userId, StepLogRequest request) {
        LocalDate day = request.recordedOn();
        if (day.isAfter(LocalDate.now())) {
            throw new ProgressBadRequestException("Cannot log steps for a future date");
        }
        if (day.isBefore(LocalDate.now().minusDays(90))) {
            throw new ProgressBadRequestException("Steps older than 90 days cannot be edited");
        }

        StepLog entity = stepLogRepository
                .findByUserIdAndRecordedOn(userId, day)
                .orElseGet(() -> {
                    StepLog created = new StepLog();
                    created.setUserId(userId);
                    created.setRecordedOn(day);
                    return created;
                });

        apply(entity, request);
        entity.setUpdatedAt(Instant.now());
        return StepLogResponse.fromEntity(stepLogRepository.saveAndFlush(entity));
    }

    @Transactional
    public void delete(String userId, UUID id) {
        StepLog entity = stepLogRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ProgressResourceNotFoundException("Step log", id));
        stepLogRepository.delete(entity);
    }

    private void apply(StepLog entity, StepLogRequest request) {
        int steps = request.steps();
        StepSource source = request.source() != null ? request.source() : StepSource.MANUAL;
        BigDecimal weight = request.weightKg() != null && request.weightKg().compareTo(BigDecimal.ZERO) > 0
                ? request.weightKg()
                : DEFAULT_WEIGHT_KG;

        entity.setSteps(steps);
        entity.setSource(source);
        entity.setSourceLabel(blankToNull(request.sourceLabel()));
        entity.setWeightKg(weight);
        entity.setCaloriesBurned(estimateCalories(steps, weight));
    }

    /**
     * Rough walking estimate: ~0.5 kcal per kg bodyweight per 1,000 steps.
     * Example: 70 kg × 8,000 steps ≈ 280 kcal.
     */
    static int estimateCalories(int steps, BigDecimal weightKg) {
        if (steps <= 0) {
            return 0;
        }
        BigDecimal kcal = weightKg
                .multiply(BigDecimal.valueOf(steps))
                .multiply(BigDecimal.valueOf(0.0005))
                .setScale(0, RoundingMode.HALF_UP);
        return Math.max(0, Math.min(20_000, kcal.intValue()));
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
