package com.brijesh.workouttracker.workout.dto;

import com.brijesh.workouttracker.workout.domain.PlanTemplateType;
import com.brijesh.workouttracker.workout.domain.Weekday;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateWorkoutPlanRequest(

        @NotBlank(message = "Plan name is required")
        @Size(max = 150, message = "Plan name must not exceed 150 characters")
        String name,

        @NotNull(message = "Template type is required")
        PlanTemplateType templateType,

        @Size(max = 1000, message = "Description must not exceed 1000 characters")
        String description,

        @Valid
        List<PlanDayRequest> days,

        /**
         * Optional Mon–Sun map. Use dayLabel to reference a day in {@code days},
         * or null / omit dayLabel for Rest.
         */
        @Valid
        List<ScheduleSlotRequest> schedule
) {

    public record PlanDayRequest(

            @NotBlank(message = "Day label is required")
            @Size(max = 80, message = "Day label must not exceed 80 characters")
            String dayLabel,

            @Min(value = 0, message = "Sort order cannot be negative")
            Integer sortOrder,

            @Valid
            List<PlanExerciseRequest> exercises
    ) {
    }

    public record PlanExerciseRequest(

            @NotBlank(message = "Exercise name is required")
            @Size(max = 150, message = "Exercise name must not exceed 150 characters")
            String name,

            @Min(value = 1, message = "Target sets must be at least 1")
            Integer targetSets,

            @Min(value = 1, message = "Target reps must be at least 1")
            Integer targetReps,

            @Min(value = 0, message = "Sort order cannot be negative")
            Integer sortOrder,

            @Size(max = 500, message = "Notes must not exceed 500 characters")
            String notes
    ) {
    }

    public record ScheduleSlotRequest(

            @NotNull(message = "Weekday is required")
            Weekday weekday,

            /** Null or blank = Rest day. Otherwise must match a dayLabel in days. */
            @Size(max = 80, message = "Day label must not exceed 80 characters")
            String dayLabel
    ) {
    }
}
