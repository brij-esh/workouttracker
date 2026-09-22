package com.brijesh.workouttracker.progress.service;

import com.brijesh.workouttracker.events.DomainEventPublisher;
import com.brijesh.workouttracker.progress.domain.RecordType;
import com.brijesh.workouttracker.progress.dto.PersonalRecordRequest;
import com.brijesh.workouttracker.progress.dto.WeightLogRequest;
import com.brijesh.workouttracker.progress.entity.PersonalRecord;
import com.brijesh.workouttracker.progress.entity.WeightLog;
import com.brijesh.workouttracker.progress.repository.BodyMeasurementRepository;
import com.brijesh.workouttracker.progress.repository.PersonalRecordRepository;
import com.brijesh.workouttracker.progress.repository.WeightLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProgressServiceTest {

    @Mock
    private WeightLogRepository weightLogRepository;

    @Mock
    private BodyMeasurementRepository bodyMeasurementRepository;

    @Mock
    private PersonalRecordRepository personalRecordRepository;

    @Mock
    private DomainEventPublisher domainEventPublisher;

    @InjectMocks
    private WeightLogService weightLogService;

    @InjectMocks
    private PersonalRecordService personalRecordService;

    @Test
    void shouldCreateWeightLog() {
        String userId = "firebase-user-1";
        WeightLogRequest request = new WeightLogRequest(
                LocalDate.now(),
                new BigDecimal("74.50"),
                "Morning"
        );

        when(weightLogRepository.save(any(WeightLog.class)))
                .thenAnswer(invocation -> {
                    WeightLog log = invocation.getArgument(0);
                    log.setId(UUID.randomUUID());
                    return log;
                });

        var response = weightLogService.create(userId, request);

        assertEquals(userId, response.userId());
        assertEquals(new BigDecimal("74.50"), response.weightKg());
        verify(weightLogRepository).save(any(WeightLog.class));
    }

    @Test
    void shouldRejectUpdateForOtherUsersWeight() {
        UUID id = UUID.randomUUID();
        WeightLogRequest request = new WeightLogRequest(
                LocalDate.of(2026, 9, 19),
                new BigDecimal("75.00"),
                null
        );

        when(weightLogRepository.findByIdAndUserId(id, "other-user"))
                .thenReturn(Optional.empty());

        assertThrows(
                ProgressResourceNotFoundException.class,
                () -> weightLogService.update("other-user", id, request)
        );
        verify(weightLogRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldBuildSummaryWithWeightChange() {
        String userId = "firebase-user-1";

        WeightLog start = new WeightLog();
        start.setWeightKg(new BigDecimal("80.00"));
        start.setRecordedOn(LocalDate.of(2026, 1, 1));

        WeightLog latest = new WeightLog();
        latest.setWeightKg(new BigDecimal("74.00"));
        latest.setRecordedOn(LocalDate.of(2026, 9, 19));

        when(weightLogRepository.findFirstByUserIdAndArchivedFalseOrderByRecordedOnDesc(userId))
                .thenReturn(Optional.of(latest));
        when(weightLogRepository.findFirstByUserIdAndArchivedFalseOrderByRecordedOnAsc(userId))
                .thenReturn(Optional.of(start));
        when(weightLogRepository.countByUserIdAndArchivedFalse(userId)).thenReturn(5L);
        when(bodyMeasurementRepository.countByUserId(userId)).thenReturn(2L);
        when(personalRecordRepository.countByUserIdAndArchivedFalse(userId)).thenReturn(3L);

        var summary = weightLogService.summary(userId);

        assertEquals(5L, summary.weightLogCount());
        assertEquals(new BigDecimal("74.00"), summary.latestWeightKg());
        assertEquals(new BigDecimal("-6.00"), summary.weightChangeKg());
    }

    @Test
    void shouldCreatePersonalRecord() {
        String userId = "firebase-user-1";
        PersonalRecordRequest request = new PersonalRecordRequest(
                "Bench Press",
                RecordType.WEIGHT_KG,
                new BigDecimal("100.00"),
                LocalDate.now(),
                "PR day"
        );

        when(personalRecordRepository.save(any(PersonalRecord.class)))
                .thenAnswer(invocation -> {
                    PersonalRecord record = invocation.getArgument(0);
                    record.setId(UUID.randomUUID());
                    return record;
                });

        var response = personalRecordService.create(userId, request);

        assertEquals("Bench Press", response.exerciseName());
        assertEquals(RecordType.WEIGHT_KG, response.recordType());
    }
}
