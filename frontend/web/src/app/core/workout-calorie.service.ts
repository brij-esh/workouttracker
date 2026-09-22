import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  CalorieBurnResult,
  CalorieSetInput,
  estimateCaloriesBurned,
  resolveBodyWeightKg
} from './calorie-burn';
import { ExerciseSet, WeightLog } from './models';

@Injectable({ providedIn: 'root' })
export class WorkoutCalorieService {
  private readonly api = inject(ApiService);

  /**
   * Estimates calories for a finished live session.
   * Session minutes should already exclude pause time.
   * Rest between sets is subtracted via each set's restSeconds.
   */
  estimateForWorkout(workoutId: string, sessionMinutes: number): Observable<CalorieBurnResult> {
    return forkJoin({
      bodyKg: this.resolveBodyWeight(),
      sets: this.loadAllSets(workoutId)
    }).pipe(
      map(({ bodyKg, sets }) =>
        estimateCaloriesBurned({
          sessionMinutes,
          bodyWeightKg: bodyKg,
          sets
        })
      )
    );
  }

  private resolveBodyWeight(): Observable<number> {
    return this.api.getMyProfile().pipe(
      switchMap((profile) => {
        if (profile.weightKg != null && Number(profile.weightKg) > 0) {
          return of(resolveBodyWeightKg(profile.weightKg));
        }
        return this.latestLoggedWeight();
      }),
      catchError(() => this.latestLoggedWeight())
    );
  }

  private latestLoggedWeight(): Observable<number> {
    return this.api.listWeightLogs().pipe(
      map((logs) => resolveBodyWeightKg(latestWeightKg(logs))),
      catchError(() => of(resolveBodyWeightKg(null)))
    );
  }

  private loadAllSets(workoutId: string): Observable<CalorieSetInput[]> {
    return this.api.listExercises(workoutId).pipe(
      switchMap((exercises) => {
        if (!exercises.length) {
          return of([] as ExerciseSet[]);
        }
        return forkJoin(
          exercises.map((ex) =>
            this.api.listExerciseSets(workoutId, ex.id).pipe(catchError(() => of([] as ExerciseSet[])))
          )
        ).pipe(map((groups) => groups.flat()));
      }),
      map((sets) =>
        sets.map(
          (s): CalorieSetInput => ({
            reps: s.reps,
            weightKg: s.weightKg,
            completed: s.completed,
            restSeconds: s.restSeconds
          })
        )
      ),
      catchError(() => of([] as CalorieSetInput[]))
    );
  }
}

function latestWeightKg(logs: WeightLog[]): number | null {
  if (!logs?.length) {
    return null;
  }
  const sorted = [...logs].sort((a, b) => String(b.recordedOn).localeCompare(String(a.recordedOn)));
  const w = Number(sorted[0]?.weightKg);
  return Number.isFinite(w) && w > 0 ? w : null;
}
