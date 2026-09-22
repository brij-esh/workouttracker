import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  NutritionTarget,
  NutritionTargetRequest,
  UserProfile,
  WeightLog
} from './models';
import {
  mapFitnessGoalToNutrition,
  suggestMacroTargets
} from '../features/nutrition/macro-targets';

/**
 * Keeps profile body weight and nutrition targets aligned when weight changes.
 */
@Injectable({ providedIn: 'root' })
export class NutritionTargetsSyncService {
  private readonly api = inject(ApiService);

  /**
   * After a body weight log create/update/delete: set profile.weightKg from the
   * latest log, then refresh macros unless the user has custom targets.
   */
  syncAfterWeightLogChange(): Observable<NutritionTarget | null> {
    return this.api.listWeightLogs().pipe(
      catchError(() => of([] as WeightLog[])),
      switchMap((logs) => {
        const latest = this.latestWeightLog(logs);
        if (!latest) {
          return of(null);
        }
        return this.updateProfileWeight(Number(latest.weightKg)).pipe(
          switchMap((profile) => this.refreshTargetsForProfile(profile, false))
        );
      }),
      catchError(() => of(null))
    );
  }

  /**
   * After profile save: recalculate macros from the new profile
   * (skips when targets are marked custom/manual).
   */
  syncAfterProfileSave(profile: UserProfile): Observable<NutritionTarget | null> {
    return this.refreshTargetsForProfile(profile, false).pipe(catchError(() => of(null)));
  }

  private latestWeightLog(logs: WeightLog[]): WeightLog | null {
    if (!logs.length) {
      return null;
    }
    return [...logs].sort((a, b) => {
      const byDate = b.recordedOn.localeCompare(a.recordedOn);
      if (byDate !== 0) {
        return byDate;
      }
      return String(b.id).localeCompare(String(a.id));
    })[0];
  }

  private updateProfileWeight(weightKg: number): Observable<UserProfile | null> {
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      return of(null);
    }
    return this.api.getMyProfile().pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of(null);
        }
        throw err;
      }),
      switchMap((profile) => {
        if (!profile) {
          return of(null);
        }
        const current = Number(profile.weightKg);
        if (Number.isFinite(current) && Math.abs(current - weightKg) < 0.05) {
          return of({ ...profile, weightKg });
        }
        return this.api.updateProfile({
          displayName: profile.displayName,
          heightCm: profile.heightCm,
          weightKg,
          dateOfBirth: profile.dateOfBirth,
          gender: profile.gender,
          fitnessGoal: profile.fitnessGoal,
          activityLevel: profile.activityLevel,
          preferredUnits: profile.preferredUnits,
          timezone: profile.timezone,
          region: profile.region,
          onboardingCompleted: profile.onboardingCompleted
        });
      })
    );
  }

  private refreshTargetsForProfile(
    profile: UserProfile | null,
    force: boolean
  ): Observable<NutritionTarget | null> {
    if (!profile) {
      return of(null);
    }

    return this.api.getNutritionTargets().pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of(null);
        }
        throw err;
      }),
      switchMap((existing) => {
        if (existing?.manualOverride && !force) {
          return of(existing);
        }

        const nutritionGoal =
          existing?.nutritionGoal ?? mapFitnessGoalToNutrition(profile.fitnessGoal);
        const suggestion = suggestMacroTargets(profile, { nutritionGoal });
        const body: NutritionTargetRequest = {
          calorieTarget: suggestion.calorieTarget,
          proteinGTarget: suggestion.proteinGTarget,
          carbsGTarget: suggestion.carbsGTarget,
          fatGTarget: suggestion.fatGTarget,
          fiberGTarget: suggestion.fiberGTarget,
          waterMlTarget: suggestion.waterMlTarget,
          nutritionGoal: suggestion.nutritionGoal,
          manualOverride: false
        };
        return this.api.upsertNutritionTargets(body);
      })
    );
  }
}
