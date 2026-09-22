package com.brijesh.workouttracker.workout.dto;

import com.brijesh.workouttracker.workout.domain.Weekday;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record UpdatePlanScheduleRequest(
        @NotNull(message = "Schedule is required")
        @Valid
        List<ScheduleSlotRequest> schedule
) {
    public record ScheduleSlotRequest(
            @NotNull(message = "Weekday is required")
            Weekday weekday,

            /** Null means Rest day. */
            UUID planDayId
    ) {
    }
}
