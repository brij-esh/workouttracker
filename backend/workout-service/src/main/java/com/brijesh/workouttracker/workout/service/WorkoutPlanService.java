package com.brijesh.workouttracker.workout.service;

import com.brijesh.workouttracker.workout.domain.PlanTemplateType;
import com.brijesh.workouttracker.workout.domain.Weekday;
import com.brijesh.workouttracker.workout.dto.CreateWorkoutPlanRequest;
import com.brijesh.workouttracker.workout.dto.CreateWorkoutRequest;
import com.brijesh.workouttracker.workout.dto.StartPlanDayRequest;
import com.brijesh.workouttracker.workout.dto.UpdatePlanScheduleRequest;
import com.brijesh.workouttracker.workout.dto.UpdateWorkoutPlanRequest;
import com.brijesh.workouttracker.workout.dto.WorkoutExerciseRequest;
import com.brijesh.workouttracker.workout.dto.WorkoutPlanResponse;
import com.brijesh.workouttracker.workout.dto.WorkoutResponse;
import com.brijesh.workouttracker.workout.entity.WorkoutPlan;
import com.brijesh.workouttracker.workout.entity.WorkoutPlanDay;
import com.brijesh.workouttracker.workout.entity.WorkoutPlanExercise;
import com.brijesh.workouttracker.workout.entity.WorkoutPlanSchedule;
import com.brijesh.workouttracker.workout.repository.WorkoutPlanDayRepository;
import com.brijesh.workouttracker.workout.repository.WorkoutPlanExerciseRepository;
import com.brijesh.workouttracker.workout.repository.WorkoutPlanRepository;
import com.brijesh.workouttracker.workout.repository.WorkoutPlanScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkoutPlanService {

    private final WorkoutPlanRepository workoutPlanRepository;
    private final WorkoutPlanDayRepository workoutPlanDayRepository;
    private final WorkoutPlanExerciseRepository workoutPlanExerciseRepository;
    private final WorkoutPlanScheduleRepository workoutPlanScheduleRepository;
    private final WorkoutService workoutService;
    private final WorkoutExerciseService workoutExerciseService;
    private final ExerciseSetService exerciseSetService;

    public List<WorkoutPlanResponse> list(String userId) {
        return workoutPlanRepository
                .findAllByUserIdAndArchivedFalseOrderByUpdatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public WorkoutPlanResponse get(String userId, UUID planId) {
        return toResponse(findOwnedActive(userId, planId));
    }

    @Transactional
    public WorkoutPlanResponse create(String userId, CreateWorkoutPlanRequest request) {
        WorkoutPlan plan = new WorkoutPlan();
        plan.setUserId(userId);
        plan.setName(request.name().trim());
        plan.setTemplateType(request.templateType());
        plan.setDescription(blankToNull(request.description()));
        plan.setArchived(false);

        WorkoutPlan saved = workoutPlanRepository.save(plan);

        List<CreateWorkoutPlanRequest.PlanDayRequest> days = request.days();
        if (days == null || days.isEmpty()) {
            days = defaultDaysFor(request.templateType());
        }
        Map<String, UUID> dayIdsByLabel = saveDays(saved.getId(), days);

        List<CreateWorkoutPlanRequest.ScheduleSlotRequest> schedule = request.schedule();
        if (schedule == null || schedule.isEmpty()) {
            schedule = defaultScheduleFor(request.templateType());
        }
        if (schedule != null && !schedule.isEmpty()) {
            saveScheduleByLabels(saved.getId(), dayIdsByLabel, schedule);
        }

        return toResponse(saved);
    }

    @Transactional
    public WorkoutPlanResponse seedTemplate(String userId, PlanTemplateType templateType) {
        if (templateType == PlanTemplateType.CUSTOM) {
            throw new WorkoutBadRequestException("Use create for custom plans");
        }

        CreateWorkoutPlanRequest request = new CreateWorkoutPlanRequest(
                templateName(templateType),
                templateType,
                templateDescription(templateType),
                defaultDaysFor(templateType),
                defaultScheduleFor(templateType)
        );
        return create(userId, request);
    }

    @Transactional
    public WorkoutPlanResponse updateDetails(
            String userId,
            UUID planId,
            UpdateWorkoutPlanRequest request
    ) {
        WorkoutPlan plan = findOwnedActive(userId, planId);
        plan.setName(request.name().trim());
        if (request.description() != null) {
            plan.setDescription(blankToNull(request.description()));
        }
        return toResponse(workoutPlanRepository.save(plan));
    }

    @Transactional
    public WorkoutPlanResponse updateSchedule(
            String userId,
            UUID planId,
            UpdatePlanScheduleRequest request
    ) {
        WorkoutPlan plan = findOwnedActive(userId, planId);
        List<WorkoutPlanDay> days = workoutPlanDayRepository.findAllByPlanIdOrderBySortOrderAsc(planId);
        Map<UUID, WorkoutPlanDay> daysById = days.stream()
                .collect(Collectors.toMap(WorkoutPlanDay::getId, Function.identity()));

        Map<Weekday, UUID> desired = new EnumMap<>(Weekday.class);
        for (UpdatePlanScheduleRequest.ScheduleSlotRequest slot : request.schedule()) {
            if (desired.containsKey(slot.weekday())) {
                throw new WorkoutBadRequestException("Duplicate weekday in schedule: " + slot.weekday());
            }
            if (slot.planDayId() != null && !daysById.containsKey(slot.planDayId())) {
                throw new WorkoutBadRequestException("Plan day not found for " + slot.weekday());
            }
            desired.put(slot.weekday(), slot.planDayId());
        }

        for (Weekday weekday : Weekday.values()) {
            UUID planDayId = desired.getOrDefault(weekday, null);
            upsertSlot(planId, weekday, planDayId);
        }

        return toResponse(plan);
    }

    @Transactional
    public WorkoutPlanResponse archive(String userId, UUID planId) {
        WorkoutPlan plan = findOwnedActive(userId, planId);
        plan.setArchived(true);
        return toResponse(workoutPlanRepository.save(plan));
    }

    @Transactional
    public void delete(String userId, UUID planId) {
        WorkoutPlan plan = findOwnedActive(userId, planId);
        workoutPlanScheduleRepository.deleteAllByPlanId(planId);
        List<UUID> dayIds = workoutPlanDayRepository.findAllByPlanIdOrderBySortOrderAsc(planId)
                .stream()
                .map(WorkoutPlanDay::getId)
                .toList();
        if (!dayIds.isEmpty()) {
            workoutPlanExerciseRepository.deleteAllByPlanDayIdIn(dayIds);
        }
        workoutPlanDayRepository.deleteAllByPlanId(planId);
        workoutPlanRepository.delete(plan);
    }

    @Transactional
    public WorkoutResponse startDay(String userId, UUID planId, StartPlanDayRequest request) {
        WorkoutPlan plan = findOwnedActive(userId, planId);
        WorkoutPlanDay day = workoutPlanDayRepository
                .findByIdAndPlanId(request.planDayId(), planId)
                .orElseThrow(() -> new WorkoutBadRequestException("Plan day not found"));

        LocalDate today = LocalDate.now();
        LocalDate workoutDate = request.workoutDate() != null ? request.workoutDate() : today;
        if (!workoutDate.equals(today)) {
            throw new WorkoutBadRequestException("Workouts can only be started for today");
        }

        String workoutName = plan.getName() + " — " + day.getDayLabel();
        WorkoutResponse workout = workoutService.createWorkout(
                userId,
                new CreateWorkoutRequest(workoutName, plan.getDescription(), today, null, null, true)
        );

        List<WorkoutPlanExercise> exercises = workoutPlanExerciseRepository
                .findAllByPlanDayIdOrderBySortOrderAsc(day.getId());

        int order = 0;
        for (WorkoutPlanExercise planExercise : exercises) {
            var created = workoutExerciseService.create(
                    userId,
                    workout.id(),
                    new WorkoutExerciseRequest(
                            planExercise.getName(),
                            planExercise.getTargetSets(),
                            planExercise.getTargetReps(),
                            null,
                            null,
                            null,
                            null,
                            planExercise.getNotes(),
                            order++
                    )
            );

            int setCount = planExercise.getTargetSets() != null ? planExercise.getTargetSets() : 0;
            for (int i = 0; i < setCount; i++) {
                exerciseSetService.create(
                        userId,
                        workout.id(),
                        created.id(),
                        new com.brijesh.workouttracker.workout.dto.ExerciseSetRequest(
                                i + 1,
                                planExercise.getTargetReps(),
                                null,
                                false,
                                90,
                                null
                        )
                );
            }
        }

        return workout;
    }

    @Transactional
    public WorkoutResponse startToday(String userId, UUID planId) {
        WorkoutPlan plan = findOwnedActive(userId, planId);
        Weekday today = fromDayOfWeek(LocalDate.now().getDayOfWeek());
        WorkoutPlanSchedule slot = workoutPlanScheduleRepository
                .findByPlanIdAndWeekday(planId, today)
                .orElse(null);

        if (slot == null || slot.getPlanDayId() == null) {
            throw new WorkoutBadRequestException("Today is a rest day for this plan");
        }

        return startDay(userId, planId, new StartPlanDayRequest(slot.getPlanDayId(), LocalDate.now()));
    }

    private WorkoutPlan findOwnedActive(String userId, UUID planId) {
        WorkoutPlan plan = workoutPlanRepository
                .findByIdAndUserId(planId, userId)
                .orElseThrow(() -> new WorkoutBadRequestException("Plan not found"));
        if (plan.isArchived()) {
            throw new WorkoutBadRequestException("This plan is archived");
        }
        return plan;
    }

    private Map<String, UUID> saveDays(UUID planId, List<CreateWorkoutPlanRequest.PlanDayRequest> days) {
        Map<String, UUID> byLabel = new java.util.LinkedHashMap<>();
        int dayOrder = 0;
        for (CreateWorkoutPlanRequest.PlanDayRequest dayReq : days) {
            WorkoutPlanDay day = new WorkoutPlanDay();
            day.setPlanId(planId);
            String label = dayReq.dayLabel().trim();
            day.setDayLabel(label);
            day.setSortOrder(dayReq.sortOrder() != null ? dayReq.sortOrder() : dayOrder);
            WorkoutPlanDay savedDay = workoutPlanDayRepository.save(day);
            byLabel.put(label.toLowerCase(), savedDay.getId());

            List<CreateWorkoutPlanRequest.PlanExerciseRequest> exercises =
                    dayReq.exercises() != null ? dayReq.exercises() : List.of();
            int exOrder = 0;
            for (CreateWorkoutPlanRequest.PlanExerciseRequest exReq : exercises) {
                WorkoutPlanExercise exercise = new WorkoutPlanExercise();
                exercise.setPlanDayId(savedDay.getId());
                exercise.setName(exReq.name().trim());
                exercise.setTargetSets(exReq.targetSets());
                exercise.setTargetReps(exReq.targetReps());
                exercise.setSortOrder(exReq.sortOrder() != null ? exReq.sortOrder() : exOrder);
                exercise.setNotes(blankToNull(exReq.notes()));
                workoutPlanExerciseRepository.save(exercise);
                exOrder++;
            }
            dayOrder++;
        }
        return byLabel;
    }

    private void saveScheduleByLabels(
            UUID planId,
            Map<String, UUID> dayIdsByLabel,
            List<CreateWorkoutPlanRequest.ScheduleSlotRequest> schedule
    ) {
        Map<Weekday, String> byWeekday = new EnumMap<>(Weekday.class);
        for (CreateWorkoutPlanRequest.ScheduleSlotRequest slot : schedule) {
            if (byWeekday.containsKey(slot.weekday())) {
                throw new WorkoutBadRequestException("Duplicate weekday in schedule: " + slot.weekday());
            }
            byWeekday.put(slot.weekday(), blankToNull(slot.dayLabel()));
        }

        for (Weekday weekday : Weekday.values()) {
            String label = byWeekday.get(weekday);
            UUID planDayId = null;
            if (label != null) {
                planDayId = dayIdsByLabel.get(label.toLowerCase());
                if (planDayId == null) {
                    throw new WorkoutBadRequestException(
                            "Schedule references unknown day label: " + label
                    );
                }
            }
            upsertSlot(planId, weekday, planDayId);
        }
    }

    private void upsertSlot(UUID planId, Weekday weekday, UUID planDayId) {
        WorkoutPlanSchedule slot = workoutPlanScheduleRepository
                .findByPlanIdAndWeekday(planId, weekday)
                .orElseGet(() -> {
                    WorkoutPlanSchedule created = new WorkoutPlanSchedule();
                    created.setPlanId(planId);
                    created.setWeekday(weekday);
                    return created;
                });
        slot.setPlanDayId(planDayId);
        workoutPlanScheduleRepository.save(slot);
    }

    private WorkoutPlanResponse toResponse(WorkoutPlan plan) {
        List<WorkoutPlanDay> days = workoutPlanDayRepository.findAllByPlanIdOrderBySortOrderAsc(plan.getId());
        List<UUID> dayIds = days.stream().map(WorkoutPlanDay::getId).toList();

        Map<UUID, List<WorkoutPlanExercise>> byDay = dayIds.isEmpty()
                ? Map.of()
                : workoutPlanExerciseRepository.findAllByPlanDayIdInOrderBySortOrderAsc(dayIds)
                .stream()
                .collect(Collectors.groupingBy(WorkoutPlanExercise::getPlanDayId));

        Map<UUID, String> labelsById = days.stream()
                .collect(Collectors.toMap(WorkoutPlanDay::getId, WorkoutPlanDay::getDayLabel));

        List<WorkoutPlanResponse.PlanDayResponse> dayResponses = days.stream()
                .map(day -> WorkoutPlanResponse.PlanDayResponse.fromEntity(
                        day,
                        byDay.getOrDefault(day.getId(), List.of()).stream()
                                .map(WorkoutPlanResponse.PlanExerciseResponse::fromEntity)
                                .toList()
                ))
                .toList();

        Map<Weekday, WorkoutPlanSchedule> slots = workoutPlanScheduleRepository
                .findAllByPlanId(plan.getId())
                .stream()
                .collect(Collectors.toMap(WorkoutPlanSchedule::getWeekday, Function.identity()));

        List<WorkoutPlanResponse.ScheduleSlotResponse> schedule = new ArrayList<>();
        for (Weekday weekday : Weekday.values()) {
            WorkoutPlanSchedule slot = slots.get(weekday);
            if (slot == null) {
                schedule.add(WorkoutPlanResponse.ScheduleSlotResponse.rest(weekday));
            } else {
                String label = slot.getPlanDayId() != null
                        ? labelsById.getOrDefault(slot.getPlanDayId(), "Day")
                        : "Rest";
                schedule.add(WorkoutPlanResponse.ScheduleSlotResponse.from(slot, label));
            }
        }

        return WorkoutPlanResponse.fromEntity(plan, dayResponses, schedule);
    }

    private String templateName(PlanTemplateType type) {
        return switch (type) {
            case PPL -> "Push / Pull / Legs";
            case UPPER_LOWER -> "Upper / Lower";
            case FULL_BODY -> "Full Body";
            case BRO_SPLIT -> "Bro Split";
            case ARNOLD -> "Arnold Split";
            case STRENGTH -> "Strength Foundations";
            case CUSTOM -> "Custom";
        };
    }

    private String templateDescription(PlanTemplateType type) {
        return switch (type) {
            case PPL -> "Classic 6-day push, pull, legs split with a weekly calendar";
            case UPPER_LOWER -> "4-day upper and lower body split with a weekly calendar";
            case FULL_BODY -> "3-day full-body program — great for beginners or busy weeks";
            case BRO_SPLIT -> "5-day body-part split: chest, back, shoulders, arms, legs";
            case ARNOLD -> "6-day Arnold split: chest/back, shoulders/arms, legs";
            case STRENGTH -> "3-day A/B strength focus with squat, bench, and deadlift";
            case CUSTOM -> "Build your own split";
        };
    }

    private List<CreateWorkoutPlanRequest.PlanDayRequest> defaultDaysFor(PlanTemplateType type) {
        return switch (type) {
            case PPL -> List.of(
                    day("Push", List.of(
                            ex("Bench Press", 4, 8),
                            ex("Overhead Press", 3, 10),
                            ex("Incline Dumbbell Press", 3, 10),
                            ex("Lateral Raise", 3, 12),
                            ex("Tricep Pushdown", 3, 12)
                    )),
                    day("Pull", List.of(
                            ex("Deadlift", 3, 5),
                            ex("Barbell Row", 4, 8),
                            ex("Lat Pulldown", 3, 10),
                            ex("Face Pull", 3, 15),
                            ex("Barbell Curl", 3, 12)
                    )),
                    day("Legs", List.of(
                            ex("Squat", 4, 6),
                            ex("Romanian Deadlift", 3, 8),
                            ex("Leg Press", 3, 12),
                            ex("Leg Curl", 3, 12),
                            ex("Calf Raise", 4, 15)
                    ))
            );
            case UPPER_LOWER -> List.of(
                    day("Upper A", List.of(
                            ex("Bench Press", 4, 8),
                            ex("Barbell Row", 4, 8),
                            ex("Overhead Press", 3, 10),
                            ex("Lat Pulldown", 3, 10),
                            ex("Lateral Raise", 3, 12)
                    )),
                    day("Lower A", List.of(
                            ex("Squat", 4, 6),
                            ex("Romanian Deadlift", 3, 8),
                            ex("Leg Press", 3, 12),
                            ex("Leg Curl", 3, 12),
                            ex("Calf Raise", 4, 15)
                    )),
                    day("Upper B", List.of(
                            ex("Incline Dumbbell Press", 4, 10),
                            ex("Seated Cable Row", 4, 10),
                            ex("Dumbbell Shoulder Press", 3, 10),
                            ex("Pull-Up / Assisted", 3, 8),
                            ex("Face Pull", 3, 15)
                    )),
                    day("Lower B", List.of(
                            ex("Front Squat / Goblet", 4, 8),
                            ex("Hip Thrust", 3, 10),
                            ex("Walking Lunge", 3, 10),
                            ex("Leg Extension", 3, 12),
                            ex("Calf Raise", 4, 15)
                    ))
            );
            case FULL_BODY -> List.of(
                    day("Full Body A", List.of(
                            ex("Squat", 3, 8),
                            ex("Bench Press", 3, 8),
                            ex("Barbell Row", 3, 8),
                            ex("Overhead Press", 2, 10),
                            ex("Plank", 3, 30)
                    )),
                    day("Full Body B", List.of(
                            ex("Romanian Deadlift", 3, 8),
                            ex("Incline Dumbbell Press", 3, 10),
                            ex("Lat Pulldown", 3, 10),
                            ex("Dumbbell Shoulder Press", 2, 10),
                            ex("Walking Lunge", 2, 10)
                    )),
                    day("Full Body C", List.of(
                            ex("Front Squat / Goblet", 3, 8),
                            ex("Push-Up / Dip", 3, 10),
                            ex("Seated Cable Row", 3, 10),
                            ex("Hip Thrust", 3, 10),
                            ex("Face Pull", 3, 15)
                    ))
            );
            case BRO_SPLIT -> List.of(
                    day("Chest", List.of(
                            ex("Bench Press", 4, 8),
                            ex("Incline Dumbbell Press", 3, 10),
                            ex("Cable Fly", 3, 12),
                            ex("Push-Up", 2, 15)
                    )),
                    day("Back", List.of(
                            ex("Deadlift", 3, 5),
                            ex("Pull-Up / Assisted", 3, 8),
                            ex("Barbell Row", 4, 8),
                            ex("Lat Pulldown", 3, 10),
                            ex("Face Pull", 3, 15)
                    )),
                    day("Shoulders", List.of(
                            ex("Overhead Press", 4, 8),
                            ex("Lateral Raise", 4, 12),
                            ex("Rear Delt Fly", 3, 12),
                            ex("Face Pull", 3, 15)
                    )),
                    day("Arms", List.of(
                            ex("Barbell Curl", 3, 10),
                            ex("Hammer Curl", 3, 12),
                            ex("Tricep Pushdown", 3, 12),
                            ex("Skull Crusher", 3, 10),
                            ex("Cable Curl", 2, 15)
                    )),
                    day("Legs", List.of(
                            ex("Squat", 4, 6),
                            ex("Romanian Deadlift", 3, 8),
                            ex("Leg Press", 3, 12),
                            ex("Leg Curl", 3, 12),
                            ex("Calf Raise", 4, 15)
                    ))
            );
            case ARNOLD -> List.of(
                    day("Chest / Back", List.of(
                            ex("Bench Press", 4, 8),
                            ex("Barbell Row", 4, 8),
                            ex("Incline Dumbbell Press", 3, 10),
                            ex("Lat Pulldown", 3, 10),
                            ex("Cable Fly", 3, 12)
                    )),
                    day("Shoulders / Arms", List.of(
                            ex("Overhead Press", 4, 8),
                            ex("Lateral Raise", 3, 12),
                            ex("Barbell Curl", 3, 10),
                            ex("Tricep Pushdown", 3, 12),
                            ex("Face Pull", 3, 15)
                    )),
                    day("Legs", List.of(
                            ex("Squat", 4, 6),
                            ex("Romanian Deadlift", 3, 8),
                            ex("Leg Press", 3, 12),
                            ex("Leg Curl", 3, 12),
                            ex("Calf Raise", 4, 15)
                    ))
            );
            case STRENGTH -> List.of(
                    day("Day A", List.of(
                            ex("Squat", 5, 5),
                            ex("Bench Press", 5, 5),
                            ex("Barbell Row", 3, 8),
                            ex("Plank", 3, 30)
                    )),
                    day("Day B", List.of(
                            ex("Deadlift", 1, 5),
                            ex("Overhead Press", 5, 5),
                            ex("Pull-Up / Assisted", 3, 8),
                            ex("Romanian Deadlift", 3, 8)
                    ))
            );
            case CUSTOM -> new ArrayList<>();
        };
    }

    private List<CreateWorkoutPlanRequest.ScheduleSlotRequest> defaultScheduleFor(PlanTemplateType type) {
        return switch (type) {
            case PPL -> List.of(
                    slot(Weekday.MONDAY, "Push"),
                    slot(Weekday.TUESDAY, "Pull"),
                    slot(Weekday.WEDNESDAY, "Legs"),
                    slot(Weekday.THURSDAY, null),
                    slot(Weekday.FRIDAY, "Push"),
                    slot(Weekday.SATURDAY, "Pull"),
                    slot(Weekday.SUNDAY, "Legs")
            );
            case UPPER_LOWER -> List.of(
                    slot(Weekday.MONDAY, "Upper A"),
                    slot(Weekday.TUESDAY, "Lower A"),
                    slot(Weekday.WEDNESDAY, null),
                    slot(Weekday.THURSDAY, "Upper B"),
                    slot(Weekday.FRIDAY, "Lower B"),
                    slot(Weekday.SATURDAY, null),
                    slot(Weekday.SUNDAY, null)
            );
            case FULL_BODY -> List.of(
                    slot(Weekday.MONDAY, "Full Body A"),
                    slot(Weekday.TUESDAY, null),
                    slot(Weekday.WEDNESDAY, "Full Body B"),
                    slot(Weekday.THURSDAY, null),
                    slot(Weekday.FRIDAY, "Full Body C"),
                    slot(Weekday.SATURDAY, null),
                    slot(Weekday.SUNDAY, null)
            );
            case BRO_SPLIT -> List.of(
                    slot(Weekday.MONDAY, "Chest"),
                    slot(Weekday.TUESDAY, "Back"),
                    slot(Weekday.WEDNESDAY, "Shoulders"),
                    slot(Weekday.THURSDAY, "Arms"),
                    slot(Weekday.FRIDAY, "Legs"),
                    slot(Weekday.SATURDAY, null),
                    slot(Weekday.SUNDAY, null)
            );
            case ARNOLD -> List.of(
                    slot(Weekday.MONDAY, "Chest / Back"),
                    slot(Weekday.TUESDAY, "Shoulders / Arms"),
                    slot(Weekday.WEDNESDAY, "Legs"),
                    slot(Weekday.THURSDAY, "Chest / Back"),
                    slot(Weekday.FRIDAY, "Shoulders / Arms"),
                    slot(Weekday.SATURDAY, "Legs"),
                    slot(Weekday.SUNDAY, null)
            );
            case STRENGTH -> List.of(
                    slot(Weekday.MONDAY, "Day A"),
                    slot(Weekday.TUESDAY, null),
                    slot(Weekday.WEDNESDAY, "Day B"),
                    slot(Weekday.THURSDAY, null),
                    slot(Weekday.FRIDAY, "Day A"),
                    slot(Weekday.SATURDAY, null),
                    slot(Weekday.SUNDAY, null)
            );
            case CUSTOM -> List.of(
                    slot(Weekday.MONDAY, null),
                    slot(Weekday.TUESDAY, null),
                    slot(Weekday.WEDNESDAY, null),
                    slot(Weekday.THURSDAY, null),
                    slot(Weekday.FRIDAY, null),
                    slot(Weekday.SATURDAY, null),
                    slot(Weekday.SUNDAY, null)
            );
        };
    }

    private CreateWorkoutPlanRequest.PlanDayRequest day(
            String label,
            List<CreateWorkoutPlanRequest.PlanExerciseRequest> exercises
    ) {
        return new CreateWorkoutPlanRequest.PlanDayRequest(label, null, exercises);
    }

    private CreateWorkoutPlanRequest.PlanExerciseRequest ex(String name, int sets, int reps) {
        return new CreateWorkoutPlanRequest.PlanExerciseRequest(name, sets, reps, null, null);
    }

    private CreateWorkoutPlanRequest.ScheduleSlotRequest slot(Weekday weekday, String dayLabel) {
        return new CreateWorkoutPlanRequest.ScheduleSlotRequest(weekday, dayLabel);
    }

    private Weekday fromDayOfWeek(DayOfWeek dayOfWeek) {
        return Weekday.valueOf(dayOfWeek.name());
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
