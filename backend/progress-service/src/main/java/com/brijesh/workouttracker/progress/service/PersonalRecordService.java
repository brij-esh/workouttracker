package com.brijesh.workouttracker.progress.service;

import com.brijesh.workouttracker.events.DomainEventPublisher;
import com.brijesh.workouttracker.events.KafkaTopics;
import com.brijesh.workouttracker.events.ProgressEventType;
import com.brijesh.workouttracker.events.ProgressUpdatedEvent;
import com.brijesh.workouttracker.progress.dto.PersonalRecordRequest;
import com.brijesh.workouttracker.progress.dto.PersonalRecordResponse;
import com.brijesh.workouttracker.progress.entity.PersonalRecord;
import com.brijesh.workouttracker.progress.repository.PersonalRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PersonalRecordService {

    private final PersonalRecordRepository personalRecordRepository;
    private final DomainEventPublisher domainEventPublisher;

    public List<PersonalRecordResponse> list(String userId) {
        return personalRecordRepository.findAllByUserIdAndArchivedFalseOrderByRecordedOnDesc(userId)
                .stream()
                .map(PersonalRecordResponse::fromEntity)
                .toList();
    }

    public List<PersonalRecordResponse> listArchived(String userId) {
        return personalRecordRepository.findAllByUserIdAndArchivedTrueOrderByRecordedOnDesc(userId)
                .stream()
                .map(PersonalRecordResponse::fromEntity)
                .toList();
    }

    public PersonalRecordResponse get(String userId, UUID id) {
        return PersonalRecordResponse.fromEntity(findOwned(userId, id));
    }

    @Transactional
    public PersonalRecordResponse create(String userId, PersonalRecordRequest request) {
        ProgressEditWindow.requireWithinWindowForMutation(request.recordedOn(), "saved");
        PersonalRecord entity = new PersonalRecord();
        entity.setUserId(userId);
        apply(entity, request);
        entity.setArchived(false);
        PersonalRecord saved = personalRecordRepository.save(entity);
        domainEventPublisher.publish(
                KafkaTopics.PROGRESS_EVENTS,
                userId,
                new ProgressUpdatedEvent(
                        ProgressEventType.PERSONAL_RECORD_LOGGED,
                        saved.getId(),
                        userId,
                        "PR logged: " + saved.getExerciseName() + " = " + saved.getValue(),
                        Instant.now()
                )
        );
        return PersonalRecordResponse.fromEntity(saved);
    }

    @Transactional
    public PersonalRecordResponse update(
            String userId,
            UUID id,
            PersonalRecordRequest request
    ) {
        PersonalRecord entity = findOwnedActive(userId, id);
        ProgressEditWindow.requireWithinWindowForMutation(entity.getRecordedOn(), "edited");
        ProgressEditWindow.requireWithinWindowForMutation(request.recordedOn(), "edited");
        apply(entity, request);
        entity.setUpdatedAt(Instant.now());
        return PersonalRecordResponse.fromEntity(personalRecordRepository.saveAndFlush(entity));
    }

    @Transactional
    public void delete(String userId, UUID id) {
        PersonalRecord entity = findOwnedActive(userId, id);
        ProgressEditWindow.requireWithinWindowForMutation(entity.getRecordedOn(), "deleted");
        personalRecordRepository.delete(entity);
    }

    @Transactional
    public PersonalRecordResponse archive(String userId, UUID id) {
        PersonalRecord entity = findOwnedActive(userId, id);
        entity.setArchived(true);
        entity.setUpdatedAt(Instant.now());
        return PersonalRecordResponse.fromEntity(personalRecordRepository.saveAndFlush(entity));
    }

    private PersonalRecord findOwned(String userId, UUID id) {
        return personalRecordRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ProgressResourceNotFoundException("Personal record", id));
    }

    private PersonalRecord findOwnedActive(String userId, UUID id) {
        PersonalRecord entity = findOwned(userId, id);
        if (entity.isArchived()) {
            throw new ProgressBadRequestException("This personal record is archived");
        }
        return entity;
    }

    private void apply(PersonalRecord entity, PersonalRecordRequest request) {
        entity.setExerciseName(request.exerciseName());
        entity.setRecordType(request.recordType());
        entity.setValue(request.value());
        entity.setRecordedOn(request.recordedOn());
        entity.setNotes(request.notes());
    }
}
