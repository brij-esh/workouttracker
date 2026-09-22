package com.brijesh.workouttracker.nutrition.service;

import com.brijesh.workouttracker.events.DomainEventPublisher;
import com.brijesh.workouttracker.events.KafkaTopics;
import com.brijesh.workouttracker.events.NutritionEventType;
import com.brijesh.workouttracker.events.NutritionLoggedEvent;
import com.brijesh.workouttracker.nutrition.dto.WaterLogRequest;
import com.brijesh.workouttracker.nutrition.dto.WaterLogResponse;
import com.brijesh.workouttracker.nutrition.entity.WaterLog;
import com.brijesh.workouttracker.nutrition.repository.WaterLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WaterLogService {

    private final WaterLogRepository waterLogRepository;
    private final DomainEventPublisher domainEventPublisher;

    public List<WaterLogResponse> list(String userId) {
        return waterLogRepository.findAllByUserIdOrderByLoggedOnDesc(userId)
                .stream()
                .map(WaterLogResponse::fromEntity)
                .toList();
    }

    public List<WaterLogResponse> listByDate(String userId, LocalDate date) {
        return waterLogRepository.findAllByUserIdAndLoggedOnOrderByCreatedAtAsc(userId, date)
                .stream()
                .map(WaterLogResponse::fromEntity)
                .toList();
    }

    public WaterLogResponse get(String userId, UUID id) {
        return WaterLogResponse.fromEntity(findOwned(userId, id));
    }

    @Transactional
    public WaterLogResponse create(String userId, WaterLogRequest request) {
        WaterLog log = new WaterLog();
        log.setUserId(userId);
        apply(log, request);
        WaterLog saved = waterLogRepository.save(log);
        domainEventPublisher.publish(
                KafkaTopics.NUTRITION_EVENTS,
                userId,
                new NutritionLoggedEvent(
                        NutritionEventType.WATER_LOGGED,
                        saved.getId(),
                        userId,
                        saved.getLoggedOn(),
                        "Water logged: " + saved.getAmountMl() + " ml",
                        Instant.now(),
                        null
                )
        );
        return WaterLogResponse.fromEntity(saved);
    }

    @Transactional
    public WaterLogResponse update(String userId, UUID id, WaterLogRequest request) {
        WaterLog log = findOwned(userId, id);
        apply(log, request);
        log.setUpdatedAt(Instant.now());
        return WaterLogResponse.fromEntity(waterLogRepository.saveAndFlush(log));
    }

    @Transactional
    public void delete(String userId, UUID id) {
        waterLogRepository.delete(findOwned(userId, id));
    }

    private WaterLog findOwned(String userId, UUID id) {
        return waterLogRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NutritionResourceNotFoundException("Water log", id));
    }

    private void apply(WaterLog log, WaterLogRequest request) {
        log.setLoggedOn(request.loggedOn());
        log.setAmountMl(request.amountMl());
        log.setNotes(request.notes());
    }
}
