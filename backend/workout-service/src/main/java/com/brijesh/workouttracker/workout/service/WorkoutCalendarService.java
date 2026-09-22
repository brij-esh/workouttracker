package com.brijesh.workouttracker.workout.service;

import com.brijesh.workouttracker.workout.dto.CalendarResponse;
import com.brijesh.workouttracker.workout.entity.Workout;
import com.brijesh.workouttracker.workout.repository.WorkoutRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkoutCalendarService {

    private final WorkoutRepository workoutRepository;

    public CalendarResponse getCalendar(String userId, LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new WorkoutBadRequestException("from and to dates are required");
        }
        if (from.isAfter(to)) {
            throw new WorkoutBadRequestException("from must be on or before to");
        }

        List<Workout> workouts = workoutRepository
                .findAllByUserIdAndArchivedFalseAndWorkoutDateBetweenOrderByWorkoutDateAsc(userId, from, to);

        Map<LocalDate, List<Workout>> byDate = new LinkedHashMap<>();
        for (Workout workout : workouts) {
            byDate.computeIfAbsent(workout.getWorkoutDate(), d -> new ArrayList<>()).add(workout);
        }

        List<CalendarResponse.CalendarDay> days = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            List<Workout> dayWorkouts = byDate.getOrDefault(date, List.of());
            days.add(new CalendarResponse.CalendarDay(
                    date,
                    dayWorkouts.size(),
                    dayWorkouts.stream()
                            .map(w -> new CalendarResponse.CalendarWorkout(
                                    w.getId(),
                                    w.getName(),
                                    w.getDurationMinutes(),
                                    w.getCaloriesBurned()
                            ))
                            .toList()
            ));
        }

        int streak = computeCurrentStreak(userId);
        return new CalendarResponse(from, to, workouts.size(), streak, days);
    }

    private int computeCurrentStreak(String userId) {
        LocalDate today = LocalDate.now();
        List<Workout> recent = workoutRepository
                .findAllByUserIdAndArchivedFalseAndWorkoutDateLessThanEqualOrderByWorkoutDateDesc(userId, today);

        Set<LocalDate> workoutDates = recent.stream()
                .map(Workout::getWorkoutDate)
                .collect(Collectors.toSet());

        if (workoutDates.isEmpty()) {
            return 0;
        }

        LocalDate cursor = workoutDates.contains(today) ? today : today.minusDays(1);
        if (!workoutDates.contains(cursor)) {
            return 0;
        }

        int streak = 0;
        while (workoutDates.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }
}
