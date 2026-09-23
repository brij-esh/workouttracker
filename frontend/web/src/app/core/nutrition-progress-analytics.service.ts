import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  Meal,
  StrengthExerciseSummary,
  StepLog,
  WaterLog,
  WeightLog,
  Workout
} from './models';

export interface NutritionProgressInsight {
  code: string;
  message: string;
}

export interface NutritionProgressAnalytics {
  windowWeeks: number;
  from: string;
  to: string;
  avgDailyCalories: number | null;
  avgDailyProteinG: number | null;
  daysWithMeals: number;
  avgDailyWaterMl: number | null;
  weightChangeKg: number | null;
  startingWeightKg: number | null;
  endingWeightKg: number | null;
  weighIns: number;
  workouts: number;
  workoutCaloriesBurned: number;
  totalSteps: number;
  daysWithSteps: number;
  avgDailySteps: number | null;
  stepCaloriesBurned: number;
  avgDailyStepCalories: number | null;
  totalCaloriesBurned: number;
  strengthTrend: 'up' | 'flat' | 'down' | 'unknown';
  strengthExercisesWithProgression: number;
  insights: NutritionProgressInsight[];
  disclaimer: string;
}

@Injectable({ providedIn: 'root' })
export class NutritionProgressAnalyticsService {
  private readonly api = inject(ApiService);

  load(weeks = 8): Observable<NutritionProgressAnalytics> {
    const to = this.localDateKey();
    const from = this.shiftDateKey(to, -(weeks * 7 - 1));

    return forkJoin({
      meals: this.api.listMeals().pipe(catchError(() => of([] as Meal[]))),
      water: this.api.listWater().pipe(catchError(() => of([] as WaterLog[]))),
      weights: this.api.listWeightLogs().pipe(catchError(() => of([] as WeightLog[]))),
      workouts: this.api.listWorkouts().pipe(catchError(() => of([] as Workout[]))),
      strength: this.api.listStrengthProgress().pipe(
        catchError(() => of([] as StrengthExerciseSummary[]))
      ),
      steps: this.api.listStepLogs({ from, to }).pipe(catchError(() => of([] as StepLog[])))
    }).pipe(
      map(({ meals, water, weights, workouts, strength, steps }) =>
        this.build(weeks, from, to, meals, water, weights, workouts, strength, steps)
      )
    );
  }

  private build(
    weeks: number,
    from: string,
    to: string,
    meals: Meal[],
    water: WaterLog[],
    weights: WeightLog[],
    workouts: Workout[],
    strength: StrengthExerciseSummary[],
    steps: StepLog[]
  ): NutritionProgressAnalytics {
    const mealDays = new Map<string, { calories: number; protein: number }>();
    for (const m of meals) {
      if (m.mealDate < from || m.mealDate > to) {
        continue;
      }
      const day = mealDays.get(m.mealDate) ?? { calories: 0, protein: 0 };
      day.calories += Number(m.calories) || 0;
      day.protein += Number(m.proteinG) || 0;
      mealDays.set(m.mealDate, day);
    }

    const waterDays = new Map<string, number>();
    for (const w of water) {
      if (w.loggedOn < from || w.loggedOn > to) {
        continue;
      }
      waterDays.set(w.loggedOn, (waterDays.get(w.loggedOn) ?? 0) + (Number(w.amountMl) || 0));
    }

    const daysWithMeals = mealDays.size;
    let avgDailyCalories: number | null = null;
    let avgDailyProteinG: number | null = null;
    if (daysWithMeals > 0) {
      let cal = 0;
      let pro = 0;
      for (const day of mealDays.values()) {
        cal += day.calories;
        pro += day.protein;
      }
      avgDailyCalories = Math.round(cal / daysWithMeals);
      avgDailyProteinG = Math.round(pro / daysWithMeals);
    }

    let avgDailyWaterMl: number | null = null;
    if (waterDays.size > 0) {
      let total = 0;
      for (const ml of waterDays.values()) {
        total += ml;
      }
      avgDailyWaterMl = Math.round(total / waterDays.size);
    }

    const windowWeights = weights
      .filter((w) => w.recordedOn >= from && w.recordedOn <= to)
      .sort((a, b) => a.recordedOn.localeCompare(b.recordedOn));
    const startingWeightKg =
      windowWeights.length > 0 ? Number(windowWeights[0].weightKg) : null;
    const endingWeightKg =
      windowWeights.length > 0
        ? Number(windowWeights[windowWeights.length - 1].weightKg)
        : null;
    const weightChangeKg =
      startingWeightKg != null && endingWeightKg != null
        ? Math.round((endingWeightKg - startingWeightKg) * 10) / 10
        : null;

    const windowWorkouts = workouts.filter((w) => {
      if (w.archived) {
        return false;
      }
      if (w.workoutDate < from || w.workoutDate > to) {
        return false;
      }
      return !w.status || w.status === 'COMPLETED';
    });
    const workoutCount = windowWorkouts.length;
    const workoutCaloriesBurned = windowWorkouts.reduce(
      (sum, w) => sum + (Number(w.caloriesBurned) || 0),
      0
    );

    const windowSteps = steps.filter((s) => s.recordedOn >= from && s.recordedOn <= to);
    const daysWithSteps = windowSteps.length;
    const totalSteps = windowSteps.reduce((sum, s) => sum + (Number(s.steps) || 0), 0);
    const stepCaloriesBurned = windowSteps.reduce(
      (sum, s) => sum + (Number(s.caloriesBurned) || 0),
      0
    );
    const avgDailySteps =
      daysWithSteps > 0 ? Math.round(totalSteps / daysWithSteps) : null;
    const avgDailyStepCalories =
      daysWithSteps > 0 ? Math.round(stepCaloriesBurned / daysWithSteps) : null;
    const totalCaloriesBurned = workoutCaloriesBurned + stepCaloriesBurned;

    const progressing = strength.filter((s) => s.progressionInsight?.detected).length;
    const declining = strength.filter((s) => {
      const pct = s.oneRmProgressPct;
      return pct != null && pct < -2;
    }).length;
    let strengthTrend: NutritionProgressAnalytics['strengthTrend'] = 'unknown';
    if (strength.length === 0) {
      strengthTrend = 'unknown';
    } else if (progressing > declining) {
      strengthTrend = 'up';
    } else if (declining > progressing) {
      strengthTrend = 'down';
    } else {
      strengthTrend = 'flat';
    }

    const insights = this.buildInsights({
      weeks,
      avgDailyCalories,
      avgDailyProteinG,
      weightChangeKg,
      workoutCount,
      strengthTrend,
      daysWithMeals,
      weighIns: windowWeights.length,
      totalSteps,
      daysWithSteps,
      avgDailySteps,
      stepCaloriesBurned,
      totalCaloriesBurned
    });

    return {
      windowWeeks: weeks,
      from,
      to,
      avgDailyCalories,
      avgDailyProteinG,
      daysWithMeals,
      avgDailyWaterMl,
      weightChangeKg,
      startingWeightKg,
      endingWeightKg,
      weighIns: windowWeights.length,
      workouts: workoutCount,
      workoutCaloriesBurned,
      totalSteps,
      daysWithSteps,
      avgDailySteps,
      stepCaloriesBurned,
      avgDailyStepCalories,
      totalCaloriesBurned,
      strengthTrend,
      strengthExercisesWithProgression: progressing,
      insights,
      disclaimer:
        'These notes describe how your logged nutrition, body weight, training, and steps moved over the same period. They show coincidence in the data, not proof that one caused the other.'
    };
  }

  private buildInsights(input: {
    weeks: number;
    avgDailyCalories: number | null;
    avgDailyProteinG: number | null;
    weightChangeKg: number | null;
    workoutCount: number;
    strengthTrend: NutritionProgressAnalytics['strengthTrend'];
    daysWithMeals: number;
    weighIns: number;
    totalSteps: number;
    daysWithSteps: number;
    avgDailySteps: number | null;
    stepCaloriesBurned: number;
    totalCaloriesBurned: number;
  }): NutritionProgressInsight[] {
    const insights: NutritionProgressInsight[] = [];
    const w = input.weeks;

    if (input.avgDailyCalories != null && input.weightChangeKg != null && input.weighIns >= 2) {
      if (input.weightChangeKg < -0.5) {
        insights.push({
          code: 'CALORIES_WEIGHT_DOWN',
          message: `Over the last ${w} weeks, your average calorie intake and body-weight trend changed over the same period (weight ${input.weightChangeKg} kg). Explore whether eating patterns coincided with the change — this is association, not causation.`
        });
      } else if (input.weightChangeKg > 0.5) {
        insights.push({
          code: 'CALORIES_WEIGHT_UP',
          message: `Over the last ${w} weeks, average calories (~${input.avgDailyCalories} kcal/day on logged days) and body weight (+${input.weightChangeKg} kg) moved together in your logs. That does not prove calories caused the weight change.`
        });
      } else {
        insights.push({
          code: 'CALORIES_WEIGHT_STABLE',
          message: `Body weight stayed relatively steady (${input.weightChangeKg >= 0 ? '+' : ''}${input.weightChangeKg} kg) while you averaged ~${input.avgDailyCalories} kcal on days you logged food.`
        });
      }
    }

    if (input.avgDailyProteinG != null && input.strengthTrend === 'up') {
      insights.push({
        code: 'PROTEIN_STRENGTH_UP',
        message: `Protein averaged ~${input.avgDailyProteinG} g on meal-logged days, and several lifts showed upward progression in this window. You can explore whether higher protein days lined up with stronger sessions — correlation only.`
      });
    }

    if (input.workoutCount > 0 && input.weightChangeKg != null && input.weighIns >= 2) {
      insights.push({
        code: 'TRAINING_WEIGHT_PARALLEL',
        message: `You completed ${input.workoutCount} workouts while weight changed by ${input.weightChangeKg >= 0 ? '+' : ''}${input.weightChangeKg} kg. Training load and scale weight often move together without one proving the other.`
      });
    }

    if (input.daysWithSteps > 0 && input.avgDailySteps != null) {
      insights.push({
        code: 'STEPS_BURN',
        message: `Steps averaged ~${input.avgDailySteps.toLocaleString()}/day across ${input.daysWithSteps} logged days (~${input.stepCaloriesBurned.toLocaleString()} kcal from walking). Combined with workouts, estimated burn in this window is ~${input.totalCaloriesBurned.toLocaleString()} kcal.`
      });
    }

    if (input.daysWithMeals < Math.max(7, Math.floor(w * 2))) {
      insights.push({
        code: 'SPARSE_NUTRITION',
        message: `Only ${input.daysWithMeals} days have meal logs in this window, so calorie and protein averages reflect logged days only — not every day.`
      });
    }

    if (!insights.length) {
      insights.push({
        code: 'NEED_MORE_DATA',
        message: `Log meals, weight, workouts, and steps over a few more weeks to see how nutrition and progress line up in your data.`
      });
    }

    return insights;
  }

  private localDateKey(date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private shiftDateKey(key: string, days: number): string {
    const [y, m, d] = key.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    return this.localDateKey(dt);
  }
}
