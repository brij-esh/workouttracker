package com.brijesh.workouttracker.workout.controller;

import com.brijesh.workouttracker.workout.dto.CalendarResponse;
import com.brijesh.workouttracker.workout.service.WorkoutCalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/workouts/calendar")
@RequiredArgsConstructor
public class WorkoutCalendarController {

    private final WorkoutCalendarService workoutCalendarService;

    @GetMapping
    public ResponseEntity<CalendarResponse> getCalendar(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(workoutCalendarService.getCalendar(userId, from, to));
    }
}
