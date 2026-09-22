package com.brijesh.workouttracker.workout.service;

import com.brijesh.workouttracker.events.DomainEventPublisher;
import com.brijesh.workouttracker.workout.dto.UpdateWorkoutRequest;
import com.brijesh.workouttracker.workout.entity.Workout;
import com.brijesh.workouttracker.workout.repository.WorkoutRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkoutServiceTest {

    @Mock
    private WorkoutRepository workoutRepository;

    @Mock
    private DomainEventPublisher domainEventPublisher;

    @InjectMocks
    private WorkoutService workoutService;

    @Test
    void shouldUpdateWorkoutForOwner() {
        UUID workoutId = UUID.randomUUID();
        String userId = "firebase-user-123";

        Workout workout = new Workout();
        workout.setId(workoutId);
        workout.setUserId(userId);
        workout.setName("Push Day");
        workout.setWorkoutDate(LocalDate.of(2026, 9, 17));
        workout.setDurationMinutes(60);
        workout.setCaloriesBurned(350);

        UpdateWorkoutRequest request = new UpdateWorkoutRequest(
                "Push Day Updated",
                "Chest and triceps",
                LocalDate.of(2026, 9, 17),
                75,
                450
        );

        when(workoutRepository.findByIdAndUserId(workoutId, userId))
                .thenReturn(Optional.of(workout));

        when(workoutRepository.save(workout))
                .thenReturn(workout);

        var response = workoutService.updateWorkout(
                workoutId,
                userId,
                request
        );

        assertEquals("Push Day Updated", response.name());
        assertEquals(75, response.durationMinutes());
        assertEquals(450, response.caloriesBurned());

        verify(workoutRepository).findByIdAndUserId(workoutId, userId);
        verify(workoutRepository).save(workout);
    }

    @Test
    void shouldRejectUpdateWhenWorkoutDoesNotBelongToUser() {
        UUID workoutId = UUID.randomUUID();
        String userId = "another-user";

        UpdateWorkoutRequest request = new UpdateWorkoutRequest(
                "Updated Workout",
                "Updated description",
                LocalDate.of(2026, 9, 17),
                60,
                300
        );

        when(workoutRepository.findByIdAndUserId(workoutId, userId))
                .thenReturn(Optional.empty());

        assertThrows(
                RuntimeException.class,
                () -> workoutService.updateWorkout(
                        workoutId,
                        userId,
                        request
                )
        );

        verify(workoutRepository, never()).save(any());
    }
}