package com.brijesh.workouttracker.progress.service;

import com.brijesh.workouttracker.events.DomainEventPublisher;
import com.brijesh.workouttracker.events.KafkaTopics;
import com.brijesh.workouttracker.events.ProgressEventType;
import com.brijesh.workouttracker.events.ProgressUpdatedEvent;
import com.brijesh.workouttracker.progress.dto.BodyMeasurementRequest;
import com.brijesh.workouttracker.progress.dto.BodyMeasurementResponse;
import com.brijesh.workouttracker.progress.entity.BodyMeasurement;
import com.brijesh.workouttracker.progress.repository.BodyMeasurementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BodyMeasurementService {

    private final BodyMeasurementRepository bodyMeasurementRepository;
    private final DomainEventPublisher domainEventPublisher;

    public List<BodyMeasurementResponse> list(String userId) {
        return bodyMeasurementRepository.findAllByUserIdOrderByRecordedOnDesc(userId)
                .stream()
                .map(BodyMeasurementResponse::fromEntity)
                .toList();
    }

    public BodyMeasurementResponse get(String userId, UUID id) {
        return BodyMeasurementResponse.fromEntity(findOwned(userId, id));
    }

    @Transactional
    public BodyMeasurementResponse create(String userId, BodyMeasurementRequest request) {
        BodyMeasurement entity = new BodyMeasurement();
        entity.setUserId(userId);
        apply(entity, request);
        BodyMeasurement saved = bodyMeasurementRepository.save(entity);
        domainEventPublisher.publish(
                KafkaTopics.PROGRESS_EVENTS,
                userId,
                new ProgressUpdatedEvent(
                        ProgressEventType.BODY_MEASUREMENT_LOGGED,
                        saved.getId(),
                        userId,
                        "Body measurements logged for " + saved.getRecordedOn(),
                        Instant.now()
                )
        );
        return BodyMeasurementResponse.fromEntity(saved);
    }

    @Transactional
    public BodyMeasurementResponse update(
            String userId,
            UUID id,
            BodyMeasurementRequest request
    ) {
        BodyMeasurement entity = findOwned(userId, id);
        apply(entity, request);
        entity.setUpdatedAt(Instant.now());
        return BodyMeasurementResponse.fromEntity(bodyMeasurementRepository.saveAndFlush(entity));
    }

    @Transactional
    public void delete(String userId, UUID id) {
        bodyMeasurementRepository.delete(findOwned(userId, id));
    }

    private BodyMeasurement findOwned(String userId, UUID id) {
        return bodyMeasurementRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ProgressResourceNotFoundException("Body measurement", id));
    }

    private void apply(BodyMeasurement entity, BodyMeasurementRequest request) {
        entity.setRecordedOn(request.recordedOn());
        entity.setChestCm(request.chestCm());
        entity.setWaistCm(request.waistCm());
        entity.setHipsCm(request.hipsCm());
        entity.setLeftArmCm(request.leftArmCm());
        entity.setRightArmCm(request.rightArmCm());
        entity.setLeftThighCm(request.leftThighCm());
        entity.setRightThighCm(request.rightThighCm());
        entity.setNeckCm(request.neckCm());
        entity.setNotes(request.notes());
    }
}
