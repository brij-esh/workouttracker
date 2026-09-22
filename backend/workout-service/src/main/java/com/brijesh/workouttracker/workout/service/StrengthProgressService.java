package com.brijesh.workouttracker.workout.service;

import com.brijesh.workouttracker.workout.dto.strength.StrengthBestSetDto;
import com.brijesh.workouttracker.workout.dto.strength.StrengthExerciseDetailDto;
import com.brijesh.workouttracker.workout.dto.strength.StrengthExerciseSummaryDto;
import com.brijesh.workouttracker.workout.dto.strength.StrengthProgressionDto;
import com.brijesh.workouttracker.workout.dto.strength.StrengthProgressionInsightDto;
import com.brijesh.workouttracker.workout.dto.strength.StrengthSessionPointDto;
import com.brijesh.workouttracker.workout.entity.ExerciseSet;
import com.brijesh.workouttracker.workout.entity.Workout;
import com.brijesh.workouttracker.workout.entity.WorkoutExercise;
import com.brijesh.workouttracker.workout.repository.ExerciseSetRepository;
import com.brijesh.workouttracker.workout.repository.WorkoutExerciseRepository;
import com.brijesh.workouttracker.workout.repository.WorkoutRepository;
import com.brijesh.workouttracker.security.RequestClock;
import com.brijesh.workouttracker.workout.util.OneRmCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StrengthProgressService {

    private static final int PROGRESSION_SERIES_LIMIT = 6;
    private static final int INSIGHT_WINDOW_WEEKS = 4;
    private static final BigDecimal MIN_INSIGHT_PCT = new BigDecimal("2.0");

    private final WorkoutExerciseRepository workoutExerciseRepository;
    private final ExerciseSetRepository exerciseSetRepository;
    private final WorkoutRepository workoutRepository;

    public List<StrengthExerciseSummaryDto> list(String userId) {
        return buildAll(userId).values().stream()
                .map(ExerciseAgg::toSummary)
                .sorted(Comparator
                        .comparing((StrengthExerciseSummaryDto s) -> s.lastPerformed(),
                                Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(StrengthExerciseSummaryDto::exerciseName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    public StrengthExerciseDetailDto detail(String userId, String exerciseKey) {
        ExerciseAgg agg = buildAll(userId).get(normalizeKey(exerciseKey));
        if (agg == null) {
            throw new WorkoutBadRequestException("No strength history found for that exercise");
        }
        return new StrengthExerciseDetailDto(agg.toSummary(), agg.historyPoints(), agg.progression());
    }

    private Map<String, ExerciseAgg> buildAll(String userId) {
        List<WorkoutExercise> exercises = workoutExerciseRepository.findActiveForUser(userId);
        if (exercises.isEmpty()) {
            return Map.of();
        }

        Map<UUID, Workout> workouts = workoutRepository
                .findAllByUserIdAndArchivedFalseOrderByWorkoutDateDesc(userId)
                .stream()
                .collect(Collectors.toMap(Workout::getId, w -> w, (a, b) -> a));

        Map<UUID, List<ExerciseSet>> setsByExercise = exerciseSetRepository
                .findAllByUserIdAndCompletedTrue(userId)
                .stream()
                .collect(Collectors.groupingBy(ExerciseSet::getExerciseId));

        Map<String, ExerciseAgg> byKey = new LinkedHashMap<>();

        for (WorkoutExercise exercise : exercises) {
            Workout workout = workouts.get(exercise.getWorkoutId());
            if (workout == null) {
                continue;
            }
            String key = normalizeKey(exercise.getName());

            List<ExerciseSet> sets = setsByExercise.getOrDefault(exercise.getId(), List.of()).stream()
                    .filter(s -> s.getReps() != null && s.getReps() > 0)
                    .filter(s -> s.getWeightKg() != null && s.getWeightKg().compareTo(BigDecimal.ZERO) > 0)
                    .toList();
            if (sets.isEmpty()) {
                continue;
            }

            ExerciseAgg agg = byKey.computeIfAbsent(key, k -> new ExerciseAgg(displayName(exercise.getName())));
            SessionSnap session = SessionSnap.from(workout.getId(), workout.getWorkoutDate(), sets);
            agg.addSession(session);
        }

        byKey.values().forEach(ExerciseAgg::finalizeStats);
        return byKey;
    }

    private static String normalizeKey(String name) {
        return name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
    }

    private static String displayName(String name) {
        return name == null ? "" : name.trim();
    }

    private static final class SessionSnap {
        private final UUID workoutId;
        private final LocalDate date;
        private final BigDecimal estimatedOneRmKg;
        private final BigDecimal maxWeightKg;
        private final BigDecimal volumeKg;
        private final Integer bestReps;
        private final StrengthBestSetDto bestSet;
        private final Integer bestRepsAtMaxWeight;

        private SessionSnap(
                UUID workoutId,
                LocalDate date,
                BigDecimal estimatedOneRmKg,
                BigDecimal maxWeightKg,
                BigDecimal volumeKg,
                Integer bestReps,
                StrengthBestSetDto bestSet,
                Integer bestRepsAtMaxWeight
        ) {
            this.workoutId = workoutId;
            this.date = date;
            this.estimatedOneRmKg = estimatedOneRmKg;
            this.maxWeightKg = maxWeightKg;
            this.volumeKg = volumeKg;
            this.bestReps = bestReps;
            this.bestSet = bestSet;
            this.bestRepsAtMaxWeight = bestRepsAtMaxWeight;
        }

        static SessionSnap from(UUID workoutId, LocalDate date, List<ExerciseSet> sets) {
            BigDecimal volume = BigDecimal.ZERO;
            BigDecimal maxWeight = BigDecimal.ZERO;
            int bestReps = 0;
            ExerciseSet bestForOneRm = null;
            BigDecimal bestOneRm = null;

            for (ExerciseSet set : sets) {
                BigDecimal w = set.getWeightKg();
                int r = set.getReps();
                volume = volume.add(w.multiply(BigDecimal.valueOf(r)));
                if (w.compareTo(maxWeight) > 0) {
                    maxWeight = w;
                }
                bestReps = Math.max(bestReps, r);
                BigDecimal oneRm = OneRmCalculator.estimate(w, r);
                if (oneRm != null && (bestOneRm == null || oneRm.compareTo(bestOneRm) > 0
                        || (oneRm.compareTo(bestOneRm) == 0 && w.compareTo(bestForOneRm.getWeightKg()) > 0))) {
                    bestOneRm = oneRm;
                    bestForOneRm = set;
                }
            }

            int bestRepsAtMax = 0;
            for (ExerciseSet set : sets) {
                if (set.getWeightKg().compareTo(maxWeight) == 0) {
                    bestRepsAtMax = Math.max(bestRepsAtMax, set.getReps());
                }
            }

            StrengthBestSetDto bestSet = bestForOneRm == null
                    ? null
                    : new StrengthBestSetDto(
                            bestForOneRm.getWeightKg(),
                            bestForOneRm.getReps(),
                            bestOneRm
                    );

            return new SessionSnap(
                    workoutId,
                    date,
                    bestOneRm,
                    maxWeight,
                    volume.setScale(2, RoundingMode.HALF_UP),
                    bestReps,
                    bestSet,
                    bestRepsAtMax
            );
        }
    }

    private static final class ExerciseAgg {
        private final String exerciseName;
        private final List<SessionSnap> sessions = new ArrayList<>();

        private BigDecimal currentOneRm;
        private BigDecimal previousOneRm;
        private BigDecimal oneRmProgressPct;
        private StrengthBestSetDto lifetimeBestSet;
        private BigDecimal volumeThisMonth = BigDecimal.ZERO;
        private BigDecimal totalVolume = BigDecimal.ZERO;
        private BigDecimal maxWeight = BigDecimal.ZERO;
        private BigDecimal averageWorkingWeight;
        private Integer bestRepsAtMaxWeight;
        private int weightPrCount;
        private int repsPrCount;
        private int volumePrCount;
        private LocalDate lastPerformed;
        private StrengthProgressionInsightDto progressionInsight;

        private ExerciseAgg(String exerciseName) {
            this.exerciseName = exerciseName;
        }

        void addSession(SessionSnap session) {
            sessions.add(session);
        }

        void finalizeStats() {
            sessions.sort(Comparator.comparing(s -> s.date));

            YearMonth thisMonth = RequestClock.currentMonth();
            BigDecimal runningMaxWeight = BigDecimal.ZERO;
            int runningMaxReps = 0;
            BigDecimal runningMaxVolume = BigDecimal.ZERO;
            BigDecimal weightSum = BigDecimal.ZERO;
            int weightSamples = 0;
            BigDecimal lifetimeMaxWeight = BigDecimal.ZERO;
            int lifetimeBestRepsAtMax = 0;
            StrengthBestSetDto best = null;
            BigDecimal bestOneRm = null;

            for (SessionSnap s : sessions) {
                totalVolume = totalVolume.add(s.volumeKg);
                if (YearMonth.from(s.date).equals(thisMonth)) {
                    volumeThisMonth = volumeThisMonth.add(s.volumeKg);
                }

                weightSum = weightSum.add(s.maxWeightKg);
                weightSamples++;

                if (s.maxWeightKg.compareTo(runningMaxWeight) > 0) {
                    runningMaxWeight = s.maxWeightKg;
                    weightPrCount++;
                }
                if (s.bestReps != null && s.bestReps > runningMaxReps) {
                    runningMaxReps = s.bestReps;
                    repsPrCount++;
                }
                if (s.volumeKg.compareTo(runningMaxVolume) > 0) {
                    runningMaxVolume = s.volumeKg;
                    volumePrCount++;
                }

                if (s.maxWeightKg.compareTo(lifetimeMaxWeight) > 0) {
                    lifetimeMaxWeight = s.maxWeightKg;
                    lifetimeBestRepsAtMax = s.bestRepsAtMaxWeight;
                } else if (s.maxWeightKg.compareTo(lifetimeMaxWeight) == 0) {
                    lifetimeBestRepsAtMax = Math.max(lifetimeBestRepsAtMax, s.bestRepsAtMaxWeight);
                }

                if (s.estimatedOneRmKg != null && (bestOneRm == null || s.estimatedOneRmKg.compareTo(bestOneRm) > 0)) {
                    bestOneRm = s.estimatedOneRmKg;
                    best = s.bestSet;
                }
            }

            maxWeight = lifetimeMaxWeight;
            bestRepsAtMaxWeight = lifetimeBestRepsAtMax;
            lifetimeBestSet = best;
            averageWorkingWeight = weightSamples == 0
                    ? null
                    : weightSum.divide(BigDecimal.valueOf(weightSamples), 2, RoundingMode.HALF_UP);
            volumeThisMonth = volumeThisMonth.setScale(2, RoundingMode.HALF_UP);
            totalVolume = totalVolume.setScale(2, RoundingMode.HALF_UP);

            if (!sessions.isEmpty()) {
                SessionSnap latest = sessions.get(sessions.size() - 1);
                lastPerformed = latest.date;
                currentOneRm = latest.estimatedOneRmKg;
                if (sessions.size() >= 2) {
                    previousOneRm = sessions.get(sessions.size() - 2).estimatedOneRmKg;
                }
            }

            if (currentOneRm != null && previousOneRm != null && previousOneRm.compareTo(BigDecimal.ZERO) > 0) {
                oneRmProgressPct = currentOneRm
                        .subtract(previousOneRm)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(previousOneRm, 1, RoundingMode.HALF_UP);
            }

            progressionInsight = buildInsight();
        }

        StrengthExerciseSummaryDto toSummary() {
            return new StrengthExerciseSummaryDto(
                    normalizeKey(exerciseName),
                    exerciseName,
                    currentOneRm,
                    previousOneRm,
                    oneRmProgressPct,
                    lifetimeBestSet,
                    volumeThisMonth,
                    totalVolume,
                    maxWeight.compareTo(BigDecimal.ZERO) == 0 ? null : maxWeight,
                    averageWorkingWeight,
                    bestRepsAtMaxWeight == 0 ? null : bestRepsAtMaxWeight,
                    weightPrCount,
                    repsPrCount,
                    volumePrCount,
                    sessions.size(),
                    lastPerformed,
                    progressionInsight
            );
        }

        List<StrengthSessionPointDto> historyPoints() {
            return sessions.stream()
                    .map(s -> new StrengthSessionPointDto(
                            s.date,
                            s.workoutId,
                            s.estimatedOneRmKg,
                            s.maxWeightKg,
                            s.volumeKg,
                            s.bestReps
                    ))
                    .toList();
        }

        StrengthProgressionDto progression() {
            List<SessionSnap> recent = recentSessions(PROGRESSION_SERIES_LIMIT);
            List<BigDecimal> weights = recent.stream().map(s -> s.maxWeightKg).toList();
            List<Integer> reps = recent.stream().map(s -> s.bestRepsAtMaxWeight).toList();
            List<BigDecimal> volumes = recent.stream().map(s -> s.volumeKg).toList();
            return new StrengthProgressionDto(weights, reps, volumes, progressionInsight);
        }

        private List<SessionSnap> recentSessions(int limit) {
            if (sessions.isEmpty()) {
                return List.of();
            }
            int from = Math.max(0, sessions.size() - limit);
            return sessions.subList(from, sessions.size());
        }

        private StrengthProgressionInsightDto buildInsight() {
            LocalDate today = RequestClock.today();
            LocalDate recentFrom = today.minusWeeks(INSIGHT_WINDOW_WEEKS);
            LocalDate priorFrom = today.minusWeeks(INSIGHT_WINDOW_WEEKS * 2L);

            List<SessionSnap> recent = sessions.stream()
                    .filter(s -> !s.date.isBefore(recentFrom))
                    .toList();
            List<SessionSnap> prior = sessions.stream()
                    .filter(s -> !s.date.isBefore(priorFrom) && s.date.isBefore(recentFrom))
                    .toList();

            if (recent.isEmpty() || prior.isEmpty()) {
                return new StrengthProgressionInsightDto(false, null, null, INSIGHT_WINDOW_WEEKS, null);
            }

            Candidate volume = candidate(
                    "volume",
                    sumVolume(recent),
                    sumVolume(prior),
                    "volume increased"
            );
            Candidate weight = candidate(
                    "weight",
                    avgWeight(recent),
                    avgWeight(prior),
                    "average top weight increased"
            );
            Candidate reps = candidate(
                    "reps",
                    avgReps(recent),
                    avgReps(prior),
                    "reps at top weight increased"
            );

            Candidate best = List.of(volume, weight, reps).stream()
                    .filter(c -> c != null && c.changePct.compareTo(MIN_INSIGHT_PCT) >= 0)
                    .max(Comparator.comparing((Candidate c) -> c.changePct)
                            .thenComparing(c -> metricPriority(c.metric)))
                    .orElse(null);

            if (best == null) {
                return new StrengthProgressionInsightDto(false, null, null, INSIGHT_WINDOW_WEEKS, null);
            }

            String message = "Progression detected: %s %s %s%% over the last %d weeks."
                    .formatted(exerciseName, best.verb, best.changePct.stripTrailingZeros().toPlainString(), INSIGHT_WINDOW_WEEKS);

            return new StrengthProgressionInsightDto(
                    true,
                    best.metric,
                    best.changePct,
                    INSIGHT_WINDOW_WEEKS,
                    message
            );
        }

        private static int metricPriority(String metric) {
            return switch (metric) {
                case "weight" -> 3;
                case "volume" -> 2;
                case "reps" -> 1;
                default -> 0;
            };
        }

        private static BigDecimal sumVolume(List<SessionSnap> rows) {
            return rows.stream()
                    .map(s -> s.volumeKg)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        private static BigDecimal avgWeight(List<SessionSnap> rows) {
            BigDecimal sum = rows.stream()
                    .map(s -> s.maxWeightKg)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            return sum.divide(BigDecimal.valueOf(rows.size()), 4, RoundingMode.HALF_UP);
        }

        private static BigDecimal avgReps(List<SessionSnap> rows) {
            double avg = rows.stream()
                    .mapToInt(s -> s.bestRepsAtMaxWeight)
                    .average()
                    .orElse(0);
            return BigDecimal.valueOf(avg).setScale(4, RoundingMode.HALF_UP);
        }

        private static Candidate candidate(String metric, BigDecimal recent, BigDecimal prior, String verb) {
            if (recent == null || prior == null || prior.compareTo(BigDecimal.ZERO) <= 0) {
                return null;
            }
            BigDecimal pct = recent.subtract(prior)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(prior, 1, RoundingMode.HALF_UP);
            return new Candidate(metric, verb, pct);
        }

        private record Candidate(String metric, String verb, BigDecimal changePct) {
        }
    }
}
