package com.brijesh.workouttracker.workout.service;

import com.brijesh.workouttracker.security.RequestClock;
import com.brijesh.workouttracker.workout.domain.Weekday;
import com.brijesh.workouttracker.workout.dto.WorkoutConsistencyResponse;
import com.brijesh.workouttracker.workout.entity.Workout;
import com.brijesh.workouttracker.workout.entity.WorkoutPlan;
import com.brijesh.workouttracker.workout.entity.WorkoutPlanSchedule;
import com.brijesh.workouttracker.workout.repository.WorkoutPlanRepository;
import com.brijesh.workouttracker.workout.repository.WorkoutPlanScheduleRepository;
import com.brijesh.workouttracker.workout.repository.WorkoutRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkoutConsistencyService {

    private static final int HEATMAP_WEEKS = 12;

    private final WorkoutRepository workoutRepository;
    private final WorkoutPlanRepository workoutPlanRepository;
    private final WorkoutPlanScheduleRepository workoutPlanScheduleRepository;

    public WorkoutConsistencyResponse getConsistency(String userId, YearMonth month) {
        LocalDate today = RequestClock.today();
        YearMonth target = month != null ? month : YearMonth.from(today);
        LocalDate monthStart = target.atDay(1);
        LocalDate monthEnd = target.atEndOfMonth();
        LocalDate monthEndInclusive = monthEnd.isAfter(today) ? today : monthEnd;

        LocalDate heatmapEnd = monthEnd.isAfter(today) ? today : monthEnd;
        LocalDate heatmapStart = heatmapEnd.minusWeeks(HEATMAP_WEEKS - 1L).with(DayOfWeek.MONDAY);

        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDate rollingFrom = today.minusDays(27);
        LocalDate dataFrom = heatmapStart;
        if (monthStart.isBefore(dataFrom)) {
            dataFrom = monthStart;
        }
        if (rollingFrom.isBefore(dataFrom)) {
            dataFrom = rollingFrom;
        }

        List<Workout> workouts = workoutRepository
                .findAllByUserIdAndArchivedFalseAndWorkoutDateBetweenOrderByWorkoutDateAsc(
                        userId, dataFrom, today
                );

        Map<LocalDate, Integer> countsByDate = new HashMap<>();
        for (Workout workout : workouts) {
            countsByDate.merge(workout.getWorkoutDate(), 1, Integer::sum);
        }

        ActivePlan activePlan = resolveActivePlan(userId);
        Set<Weekday> plannedWeekdays = activePlan.plannedWeekdays();

        int workoutsThisMonth = countWorkoutsInRange(countsByDate, monthStart, monthEndInclusive);
        int workoutsThisWeek = countWorkoutsInRange(countsByDate, weekStart, today);

        int planned = 0;
        int plannedHit = 0;
        int missed = 0;
        for (LocalDate date = monthStart; !date.isAfter(monthEnd); date = date.plusDays(1)) {
            if (!isPlanned(date, plannedWeekdays)) {
                continue;
            }
            planned++;
            if (date.isAfter(today)) {
                continue;
            }
            int count = countsByDate.getOrDefault(date, 0);
            if (count > 0) {
                plannedHit++;
            } else {
                missed++;
            }
        }

        int plannedElapsed = plannedHit + missed;
        int consistencyPercent = plannedElapsed == 0
                ? (workoutsThisMonth > 0 ? 100 : 0)
                : (int) Math.round(100.0 * plannedHit / plannedElapsed);

        LocalDate freqFrom = today.minusDays(27);
        int last28 = countWorkoutsInRange(countsByDate, freqFrom, today);
        double trainingFrequency = round1(last28 / 4.0);

        long monthDays = ChronoUnit.DAYS.between(monthStart, monthEndInclusive) + 1;
        double weeksInMonth = Math.max(monthDays / 7.0, 1.0 / 7.0);
        double averageWorkoutsPerWeek = round1(workoutsThisMonth / weeksInMonth);

        int streak = computeCurrentStreak(userId, today, countsByDate);

        List<WorkoutConsistencyResponse.HeatmapRow> heatmap = buildHeatmap(
                heatmapStart,
                heatmapEnd,
                today,
                countsByDate,
                plannedWeekdays
        );

        String monthLabel = target.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH)
                + " "
                + target.getYear();

        return new WorkoutConsistencyResponse(
                target.toString(),
                monthLabel,
                activePlan.name(),
                workoutsThisMonth,
                planned,
                missed,
                consistencyPercent,
                workoutsThisWeek,
                workoutsThisMonth,
                streak,
                averageWorkoutsPerWeek,
                trainingFrequency,
                heatmap
        );
    }

    private ActivePlan resolveActivePlan(String userId) {
        List<WorkoutPlan> plans = workoutPlanRepository
                .findAllByUserIdAndArchivedFalseOrderByUpdatedAtDesc(userId);
        if (plans.isEmpty()) {
            return new ActivePlan(null, EnumSet.noneOf(Weekday.class));
        }
        WorkoutPlan plan = plans.getFirst();
        List<WorkoutPlanSchedule> schedule = workoutPlanScheduleRepository.findAllByPlanId(plan.getId());
        EnumSet<Weekday> planned = EnumSet.noneOf(Weekday.class);
        for (WorkoutPlanSchedule slot : schedule) {
            if (slot.getPlanDayId() != null) {
                planned.add(slot.getWeekday());
            }
        }
        return new ActivePlan(plan.getName(), planned);
    }

    private List<WorkoutConsistencyResponse.HeatmapRow> buildHeatmap(
            LocalDate startMonday,
            LocalDate end,
            LocalDate today,
            Map<LocalDate, Integer> countsByDate,
            Set<Weekday> plannedWeekdays
    ) {
        List<LocalDate> weekStarts = new ArrayList<>();
        for (LocalDate cursor = startMonday; !cursor.isAfter(end); cursor = cursor.plusWeeks(1)) {
            weekStarts.add(cursor);
        }

        List<DayOfWeek> rowOrder = List.of(
                DayOfWeek.MONDAY,
                DayOfWeek.TUESDAY,
                DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY,
                DayOfWeek.FRIDAY,
                DayOfWeek.SATURDAY,
                DayOfWeek.SUNDAY
        );

        List<WorkoutConsistencyResponse.HeatmapRow> rows = new ArrayList<>();
        for (DayOfWeek dow : rowOrder) {
            List<WorkoutConsistencyResponse.HeatmapCell> cells = new ArrayList<>();
            for (LocalDate weekStart : weekStarts) {
                LocalDate date = weekStart.with(dow);
                if (date.isBefore(startMonday) || date.isAfter(end)) {
                    cells.add(new WorkoutConsistencyResponse.HeatmapCell(date, 0, 0, false, false));
                    continue;
                }
                int count = date.isAfter(today) ? 0 : countsByDate.getOrDefault(date, 0);
                boolean planned = isPlanned(date, plannedWeekdays);
                boolean missed = planned && !date.isAfter(today) && count == 0;
                cells.add(new WorkoutConsistencyResponse.HeatmapCell(
                        date,
                        intensityLevel(count),
                        count,
                        planned,
                        missed
                ));
            }
            String label = dow.getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            rows.add(new WorkoutConsistencyResponse.HeatmapRow(label, cells));
        }
        return rows;
    }

    private int computeCurrentStreak(String userId, LocalDate today, Map<LocalDate, Integer> windowCounts) {
        Set<LocalDate> workoutDates = new HashSet<>(windowCounts.keySet());
        workoutDates.removeIf(d -> windowCounts.getOrDefault(d, 0) <= 0);

        // Extend history if streak may reach beyond the heatmap window
        if (!workoutDates.contains(today) && !workoutDates.contains(today.minusDays(1))) {
            return 0;
        }
        List<Workout> recent = workoutRepository
                .findAllByUserIdAndArchivedFalseAndWorkoutDateLessThanEqualOrderByWorkoutDateDesc(userId, today);
        Set<LocalDate> allDates = recent.stream()
                .map(Workout::getWorkoutDate)
                .collect(Collectors.toSet());

        LocalDate cursor = allDates.contains(today) ? today : today.minusDays(1);
        if (!allDates.contains(cursor)) {
            return 0;
        }
        int streak = 0;
        while (allDates.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    private static int countWorkoutsInRange(Map<LocalDate, Integer> counts, LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            return 0;
        }
        int total = 0;
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            total += counts.getOrDefault(date, 0);
        }
        return total;
    }

    private static boolean isPlanned(LocalDate date, Set<Weekday> plannedWeekdays) {
        if (plannedWeekdays.isEmpty()) {
            return false;
        }
        return plannedWeekdays.contains(toWeekday(date.getDayOfWeek()));
    }

    private static Weekday toWeekday(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> Weekday.MONDAY;
            case TUESDAY -> Weekday.TUESDAY;
            case WEDNESDAY -> Weekday.WEDNESDAY;
            case THURSDAY -> Weekday.THURSDAY;
            case FRIDAY -> Weekday.FRIDAY;
            case SATURDAY -> Weekday.SATURDAY;
            case SUNDAY -> Weekday.SUNDAY;
        };
    }

    private static int intensityLevel(int count) {
        if (count <= 0) {
            return 0;
        }
        if (count == 1) {
            return 1;
        }
        if (count == 2) {
            return 2;
        }
        if (count == 3) {
            return 3;
        }
        return 4;
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private record ActivePlan(String name, Set<Weekday> plannedWeekdays) {
    }
}
