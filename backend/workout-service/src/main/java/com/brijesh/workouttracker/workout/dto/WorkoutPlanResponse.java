package com.brijesh.workouttracker.workout.dto;

import com.brijesh.workouttracker.workout.domain.PlanTemplateType;
import com.brijesh.workouttracker.workout.domain.Weekday;
import com.brijesh.workouttracker.workout.entity.WorkoutPlan;
import com.brijesh.workouttracker.workout.entity.WorkoutPlanDay;
import com.brijesh.workouttracker.workout.entity.WorkoutPlanExercise;
import com.brijesh.workouttracker.workout.entity.WorkoutPlanSchedule;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WorkoutPlanResponse(
        UUID id,
        String userId,
        String name,
        PlanTemplateType templateType,
        String description,
        boolean archived,
        Instant createdAt,
        Instant updatedAt,
        List<PlanDayResponse> days,
        List<ScheduleSlotResponse> schedule
) {

    public static WorkoutPlanResponse fromEntity(
            WorkoutPlan plan,
            List<PlanDayResponse> days,
            List<ScheduleSlotResponse> schedule
    ) {
        return new WorkoutPlanResponse(
                plan.getId(),
                plan.getUserId(),
                plan.getName(),
                plan.getTemplateType(),
                plan.getDescription(),
                plan.isArchived(),
                plan.getCreatedAt(),
                plan.getUpdatedAt(),
                days,
                schedule
        );
    }

    public record PlanDayResponse(
            UUID id,
            String dayLabel,
            Integer sortOrder,
            List<PlanExerciseResponse> exercises
    ) {
        public static PlanDayResponse fromEntity(WorkoutPlanDay day, List<PlanExerciseResponse> exercises) {
            return new PlanDayResponse(
                    day.getId(),
                    day.getDayLabel(),
                    day.getSortOrder(),
                    exercises
            );
        }
    }

    public record PlanExerciseResponse(
            UUID id,
            String name,
            Integer targetSets,
            Integer targetReps,
            Integer sortOrder,
            String notes
    ) {
        public static PlanExerciseResponse fromEntity(WorkoutPlanExercise exercise) {
            return new PlanExerciseResponse(
                    exercise.getId(),
                    exercise.getName(),
                    exercise.getTargetSets(),
                    exercise.getTargetReps(),
                    exercise.getSortOrder(),
                    exercise.getNotes()
            );
        }
    }

    public record ScheduleSlotResponse(
            Weekday weekday,
            UUID planDayId,
            String dayLabel,
            boolean restDay
    ) {
        public static ScheduleSlotResponse from(
                WorkoutPlanSchedule slot,
                String dayLabel
        ) {
            boolean rest = slot.getPlanDayId() == null;
            return new ScheduleSlotResponse(
                    slot.getWeekday(),
                    slot.getPlanDayId(),
                    rest ? "Rest" : dayLabel,
                    rest
            );
        }

        public static ScheduleSlotResponse rest(Weekday weekday) {
            return new ScheduleSlotResponse(weekday, null, "Rest", true);
        }
    }
}
