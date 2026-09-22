import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { ApiService } from './api.service';
import {
  Meal,
  NotificationItem,
  PersonalRecord,
  StrengthExerciseSummary,
  UserProfile,
  WaterLog,
  WeightLog,
  Workout
} from './models';

export interface HomeDashboardData {
  profile: UserProfile | null;
  /** True when GET /users/me returned 404 (account has no profile yet). */
  profileMissing: boolean;
  /** True when profile failed for a non-404 reason (network/5xx). */
  profileUnavailable: boolean;
  workouts: Workout[];
  notes: NotificationItem[];
  unreadCount: number;
  meals: Meal[];
  water: WaterLog[];
  weights: WeightLog[];
  records: PersonalRecord[];
  strength: StrengthExerciseSummary[];
  todayKey: string;
}

/** Composes home widgets; individual GETs are cached by ApiService. */
@Injectable({ providedIn: 'root' })
export class HomeDashboardService {
  private readonly api = inject(ApiService);

  load(todayKey: string): Observable<HomeDashboardData> {
    return forkJoin({
      profile: this.api.getMyProfile().pipe(
        map((profile) => ({ profile, profileMissing: false, profileUnavailable: false })),
        catchError((err: { status?: number }) =>
          of({
            profile: null as UserProfile | null,
            profileMissing: err?.status === 404,
            profileUnavailable: err?.status !== 404
          })
        )
      ),
      workouts: this.api.listWorkouts().pipe(catchError(() => of([] as Workout[]))),
      notes: this.api
        .listNotifications({ page: 0, size: 4, unreadOnly: true })
        .pipe(catchError(() => of({ content: [] as NotificationItem[] }))),
      unread: this.api.unreadCount().pipe(catchError(() => of({ unreadCount: 0 }))),
      meals: this.api.listMeals(todayKey).pipe(catchError(() => of([] as Meal[]))),
      water: this.api.listWater(todayKey).pipe(catchError(() => of([] as WaterLog[]))),
      weights: this.api.listWeightLogs().pipe(catchError(() => of([] as WeightLog[]))),
      records: this.api.listPersonalRecords().pipe(catchError(() => of([] as PersonalRecord[]))),
      strength: this.api.listStrengthProgress().pipe(catchError(() => of([] as StrengthExerciseSummary[])))
    }).pipe(
      map((raw) => ({
        profile: raw.profile.profile,
        profileMissing: raw.profile.profileMissing,
        profileUnavailable: raw.profile.profileUnavailable,
        workouts: [...raw.workouts].sort((a, b) => b.workoutDate.localeCompare(a.workoutDate)),
        notes: raw.notes.content ?? [],
        unreadCount: raw.unread.unreadCount ?? 0,
        meals: raw.meals,
        water: raw.water,
        weights: [...raw.weights].sort((a, b) => b.recordedOn.localeCompare(a.recordedOn)),
        records: [...raw.records].sort((a, b) => b.recordedOn.localeCompare(a.recordedOn)),
        strength: raw.strength,
        todayKey
      }))
    );
  }
}
