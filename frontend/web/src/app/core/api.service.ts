import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiCacheService, CacheScope } from './api-cache.service';
import {
  CreateUserProfileRequest,
  CreateWorkoutPlanRequest,
  CalendarResponse,
  ExerciseLibraryMeta,
  ExerciseSet,
  ExerciseSetRequest,
  ExercisePreviousPerformance,
  FoodItem,
  FoodItemRequest,
  FoodLibraryMeta,
  LibraryExercise,
  LibraryExerciseRequest,
  Meal,
  MealRequest,
  NotificationItem,
  NutritionTarget,
  NutritionTargetRequest,
  PageResponse,
  PersonalRecord,
  PersonalRecordRequest,
  PlanTemplateType,
  StrengthExerciseDetail,
  StrengthExerciseSummary,
  UserProfile,
  WaterLog,
  WaterLogRequest,
  WeightLog,
  WeightLogRequest,
  WeightGoalRequest,
  BodyWeightProgress,
  Workout,
  WorkoutConsistency,
  WorkoutExercise,
  WorkoutExerciseRequest,
  WorkoutPlan,
  WorkoutRequest,
  UpdatePlanScheduleRequest,
  UpdateWorkoutPlanRequest
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(ApiCacheService);
  private readonly base = environment.apiBaseUrl;

  getMyProfile(): Observable<UserProfile> {
    return this.cached('profile:me', ['profile'], () =>
      this.http.get<UserProfile>(`${this.base}/users/me`)
    );
  }

  createProfile(body: CreateUserProfileRequest): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${this.base}/users`, body).pipe(
      tap((profile) => {
        this.cache.invalidate('profile');
        this.cache.set('profile:me', profile, ['profile']);
      })
    );
  }

  updateProfile(body: CreateUserProfileRequest): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.base}/users/me`, body).pipe(
      tap((profile) => {
        this.cache.invalidate('profile');
        this.cache.set('profile:me', profile, ['profile']);
      })
    );
  }

  listWorkouts(): Observable<Workout[]> {
    return this.cached('workouts:list', ['workouts'], () =>
      this.http.get<Workout[]>(`${this.base}/workouts`)
    );
  }

  listWorkoutsPage(options?: {
    page?: number;
    size?: number;
  }): Observable<PageResponse<Workout> | Workout[]> {
    const page = options?.page ?? 0;
    const size = options?.size ?? 20;
    const qs = new URLSearchParams({
      page: String(page),
      size: String(size)
    }).toString();
    return this.cached(`workouts:page:${qs}`, ['workouts'], () =>
      this.http.get<PageResponse<Workout> | Workout[]>(`${this.base}/workouts?${qs}`)
    );
  }

  listArchivedWorkouts(): Observable<Workout[]> {
    return this.cached('archived:workouts', ['archived'], () =>
      this.http.get<Workout[]>(`${this.base}/workouts/archived`)
    );
  }

  getWorkout(id: string): Observable<Workout> {
    return this.cached(`workouts:item:${id}`, ['workouts'], () =>
      this.http.get<Workout>(`${this.base}/workouts/${id}`)
    );
  }

  createWorkout(body: WorkoutRequest): Observable<Workout> {
    return this.http
      .post<Workout>(`${this.base}/workouts`, body)
      .pipe(tap((workout) => this.afterWorkoutWrite(workout)));
  }

  updateWorkout(id: string, body: WorkoutRequest): Observable<Workout> {
    return this.http
      .put<Workout>(`${this.base}/workouts/${id}`, body)
      .pipe(tap((workout) => this.afterWorkoutWrite(workout)));
  }

  pauseWorkout(id: string, elapsedMs?: number | null): Observable<Workout> {
    return this.http
      .post<Workout>(`${this.base}/workouts/${id}/pause`, { elapsedMs: elapsedMs ?? null })
      .pipe(tap((workout) => this.afterWorkoutWrite(workout)));
  }

  resumeWorkout(id: string): Observable<Workout> {
    return this.http
      .post<Workout>(`${this.base}/workouts/${id}/resume`, {})
      .pipe(tap((workout) => this.afterWorkoutWrite(workout)));
  }

  completeWorkout(
    id: string,
    body: { durationMinutes?: number | null; caloriesBurned?: number | null; elapsedMs?: number | null }
  ): Observable<Workout> {
    return this.http
      .post<Workout>(`${this.base}/workouts/${id}/complete`, body)
      .pipe(tap((workout) => this.afterWorkoutWrite(workout)));
  }

  archiveWorkout(id: string): Observable<Workout> {
    return this.http
      .post<Workout>(`${this.base}/workouts/${id}/archive`, {})
      .pipe(tap(() => this.cache.invalidate('workouts', 'archived', 'notifications')));
  }

  deleteWorkout(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/workouts/${id}`)
      .pipe(tap(() => this.cache.invalidate('workouts', 'archived', 'notifications')));
  }

  listExercises(workoutId: string): Observable<WorkoutExercise[]> {
    return this.cached(`workouts:exercises:${workoutId}`, ['workouts'], () =>
      this.http.get<WorkoutExercise[]>(`${this.base}/workouts/${workoutId}/exercises`)
    );
  }

  listArchivedExercises(): Observable<WorkoutExercise[]> {
    return this.cached('archived:exercises', ['archived'], () =>
      this.http.get<WorkoutExercise[]>(`${this.base}/workouts/exercises/archived`)
    );
  }

  createExercise(workoutId: string, body: WorkoutExerciseRequest): Observable<WorkoutExercise> {
    return this.http
      .post<WorkoutExercise>(`${this.base}/workouts/${workoutId}/exercises`, body)
      .pipe(tap(() => this.cache.invalidate('workouts')));
  }

  updateExercise(
    workoutId: string,
    exerciseId: string,
    body: WorkoutExerciseRequest
  ): Observable<WorkoutExercise> {
    return this.http
      .put<WorkoutExercise>(`${this.base}/workouts/${workoutId}/exercises/${exerciseId}`, body)
      .pipe(tap(() => this.cache.invalidate('workouts')));
  }

  archiveExercise(workoutId: string, exerciseId: string): Observable<WorkoutExercise> {
    return this.http
      .post<WorkoutExercise>(
        `${this.base}/workouts/${workoutId}/exercises/${exerciseId}/archive`,
        {}
      )
      .pipe(tap(() => this.cache.invalidate('workouts', 'archived')));
  }

  deleteExercise(workoutId: string, exerciseId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/workouts/${workoutId}/exercises/${exerciseId}`)
      .pipe(tap(() => this.cache.invalidate('workouts')));
  }

  listExerciseSets(workoutId: string, exerciseId: string): Observable<ExerciseSet[]> {
    return this.cached(`workouts:sets:${workoutId}:${exerciseId}`, ['workouts'], () =>
      this.http.get<ExerciseSet[]>(
        `${this.base}/workouts/${workoutId}/exercises/${exerciseId}/sets`
      )
    );
  }

  getExercisePreviousPerformance(
    workoutId: string,
    exerciseId: string
  ): Observable<ExercisePreviousPerformance> {
    return this.cached(`workouts:prev:${workoutId}:${exerciseId}`, ['workouts'], () =>
      this.http.get<ExercisePreviousPerformance>(
        `${this.base}/workouts/${workoutId}/exercises/${exerciseId}/previous-performance`
      )
    );
  }

  createExerciseSet(
    workoutId: string,
    exerciseId: string,
    body: ExerciseSetRequest
  ): Observable<ExerciseSet> {
    return this.http
      .post<ExerciseSet>(
        `${this.base}/workouts/${workoutId}/exercises/${exerciseId}/sets`,
        body
      )
      .pipe(tap(() => this.cache.invalidate('workouts')));
  }

  updateExerciseSet(
    workoutId: string,
    exerciseId: string,
    setId: string,
    body: ExerciseSetRequest
  ): Observable<ExerciseSet> {
    return this.http
      .put<ExerciseSet>(
        `${this.base}/workouts/${workoutId}/exercises/${exerciseId}/sets/${setId}`,
        body
      )
      .pipe(tap(() => this.cache.invalidate('workouts')));
  }

  deleteExerciseSet(workoutId: string, exerciseId: string, setId: string): Observable<void> {
    return this.http
      .delete<void>(
        `${this.base}/workouts/${workoutId}/exercises/${exerciseId}/sets/${setId}`
      )
      .pipe(tap(() => this.cache.invalidate('workouts')));
  }

  getWorkoutCalendar(from: string, to: string): Observable<CalendarResponse> {
    return this.cached(`workouts:calendar:${from}:${to}`, ['workouts'], () =>
      this.http.get<CalendarResponse>(
        `${this.base}/workouts/calendar?from=${from}&to=${to}`
      )
    );
  }

  getWorkoutConsistency(month?: string): Observable<WorkoutConsistency> {
    const q = month ? `?month=${encodeURIComponent(month)}` : '';
    return this.cached(`workouts:consistency:${month ?? 'current'}`, ['workouts', 'workout-plans'], () =>
      this.http.get<WorkoutConsistency>(`${this.base}/workouts/consistency${q}`)
    );
  }

  listWorkoutPlans(): Observable<WorkoutPlan[]> {
    return this.cached('plans:list', ['workout-plans'], () =>
      this.http.get<WorkoutPlan[]>(`${this.base}/workout-plans`)
    );
  }

  getWorkoutPlan(id: string): Observable<WorkoutPlan> {
    return this.cached(`plans:item:${id}`, ['workout-plans'], () =>
      this.http.get<WorkoutPlan>(`${this.base}/workout-plans/${id}`)
    );
  }

  createWorkoutPlan(body: CreateWorkoutPlanRequest): Observable<WorkoutPlan> {
    return this.http
      .post<WorkoutPlan>(`${this.base}/workout-plans`, body)
      .pipe(tap((plan) => this.afterPlanWrite(plan)));
  }

  seedWorkoutPlanTemplate(templateType: PlanTemplateType): Observable<WorkoutPlan> {
    return this.http
      .post<WorkoutPlan>(`${this.base}/workout-plans/templates/${templateType}`, {})
      .pipe(tap((plan) => this.afterPlanWrite(plan)));
  }

  startPlanDay(
    planId: string,
    body: { planDayId: string; workoutDate?: string | null }
  ): Observable<Workout> {
    return this.http
      .post<Workout>(`${this.base}/workout-plans/${planId}/start-day`, body)
      .pipe(tap((workout) => this.afterWorkoutWrite(workout)));
  }

  startPlanToday(planId: string): Observable<Workout> {
    return this.http
      .post<Workout>(`${this.base}/workout-plans/${planId}/start-today`, {})
      .pipe(tap((workout) => this.afterWorkoutWrite(workout)));
  }

  updatePlanSchedule(planId: string, body: UpdatePlanScheduleRequest): Observable<WorkoutPlan> {
    return this.http
      .put<WorkoutPlan>(`${this.base}/workout-plans/${planId}/schedule`, body)
      .pipe(tap((plan) => this.afterPlanWrite(plan)));
  }

  updateWorkoutPlan(planId: string, body: UpdateWorkoutPlanRequest): Observable<WorkoutPlan> {
    return this.http
      .put<WorkoutPlan>(`${this.base}/workout-plans/${planId}`, body)
      .pipe(tap((plan) => this.afterPlanWrite(plan)));
  }

  archiveWorkoutPlan(id: string): Observable<WorkoutPlan> {
    return this.http
      .post<WorkoutPlan>(`${this.base}/workout-plans/${id}/archive`, {})
      .pipe(tap(() => this.cache.invalidate('workout-plans', 'archived')));
  }

  deleteWorkoutPlan(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/workout-plans/${id}`)
      .pipe(tap(() => this.cache.invalidate('workout-plans', 'archived')));
  }

  listStrengthProgress(): Observable<StrengthExerciseSummary[]> {
    return this.cached('strength-progress:list', ['workouts'], () =>
      this.http.get<StrengthExerciseSummary[]>(`${this.base}/strength-progress`)
    );
  }

  getStrengthProgress(exerciseKey: string): Observable<StrengthExerciseDetail> {
    const key = encodeURIComponent(exerciseKey);
    return this.cached(`strength-progress:item:${exerciseKey}`, ['workouts'], () =>
      this.http.get<StrengthExerciseDetail>(`${this.base}/strength-progress/${key}`)
    );
  }

  listWeightLogs(): Observable<WeightLog[]> {
    return this.cached('progress:weight', ['progress'], () =>
      this.http.get<WeightLog[]>(`${this.base}/progress/weight`)
    );
  }

  getBodyWeightProgress(): Observable<BodyWeightProgress> {
    return this.cached('progress:weight-overview', ['progress'], () =>
      this.http.get<BodyWeightProgress>(`${this.base}/progress/weight/overview`)
    );
  }

  upsertWeightGoal(body: WeightGoalRequest): Observable<BodyWeightProgress> {
    return this.http
      .put<BodyWeightProgress>(`${this.base}/progress/weight/goal`, body)
      .pipe(tap(() => this.cache.invalidate('progress')));
  }

  listArchivedWeightLogs(): Observable<WeightLog[]> {
    return this.cached('archived:weight', ['archived'], () =>
      this.http.get<WeightLog[]>(`${this.base}/progress/weight/archived`)
    );
  }

  createWeightLog(body: WeightLogRequest): Observable<WeightLog> {
    return this.http.post<WeightLog>(`${this.base}/progress/weight`, body).pipe(
      tap((row) => {
        const prev = this.cache.peek<WeightLog[]>('progress:weight') ?? [];
        this.cache.set(
          'progress:weight',
          [row, ...prev.filter((w) => w.id !== row.id)],
          ['progress']
        );
        this.cache.invalidateKeys('progress:weight-overview');
      })
    );
  }

  updateWeightLog(id: string, body: WeightLogRequest): Observable<WeightLog> {
    return this.http.put<WeightLog>(`${this.base}/progress/weight/${id}`, body).pipe(
      tap((row) => {
        const prev = this.cache.peek<WeightLog[]>('progress:weight') ?? [];
        this.cache.set(
          'progress:weight',
          prev.map((w) => (w.id === id ? row : w)),
          ['progress']
        );
        this.cache.invalidateKeys('progress:weight-overview');
      })
    );
  }

  deleteWeightLog(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/progress/weight/${id}`).pipe(
      tap(() => {
        const prev = this.cache.peek<WeightLog[]>('progress:weight') ?? [];
        this.cache.invalidate('archived');
        this.cache.invalidateKeys('progress:weight-overview');
        this.cache.set(
          'progress:weight',
          prev.filter((w) => w.id !== id),
          ['progress']
        );
      })
    );
  }

  archiveWeightLog(id: string): Observable<WeightLog> {
    return this.http
      .post<WeightLog>(`${this.base}/progress/weight/${id}/archive`, {})
      .pipe(tap(() => this.cache.invalidate('progress', 'archived')));
  }

  listPersonalRecords(): Observable<PersonalRecord[]> {
    return this.cached('progress:prs', ['progress'], () =>
      this.http.get<PersonalRecord[]>(`${this.base}/progress/personal-records`)
    );
  }

  listArchivedPersonalRecords(): Observable<PersonalRecord[]> {
    return this.cached('archived:prs', ['archived'], () =>
      this.http.get<PersonalRecord[]>(`${this.base}/progress/personal-records/archived`)
    );
  }

  createPersonalRecord(body: PersonalRecordRequest): Observable<PersonalRecord> {
    return this.http.post<PersonalRecord>(`${this.base}/progress/personal-records`, body).pipe(
      tap((row) => {
        const prev = this.cache.peek<PersonalRecord[]>('progress:prs') ?? [];
        this.cache.set(
          'progress:prs',
          [row, ...prev.filter((r) => r.id !== row.id)],
          ['progress']
        );
      })
    );
  }

  updatePersonalRecord(id: string, body: PersonalRecordRequest): Observable<PersonalRecord> {
    return this.http.put<PersonalRecord>(`${this.base}/progress/personal-records/${id}`, body).pipe(
      tap((row) => {
        const prev = this.cache.peek<PersonalRecord[]>('progress:prs') ?? [];
        this.cache.set(
          'progress:prs',
          prev.map((r) => (r.id === id ? row : r)),
          ['progress']
        );
      })
    );
  }

  deletePersonalRecord(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/progress/personal-records/${id}`).pipe(
      tap(() => {
        const prev = this.cache.peek<PersonalRecord[]>('progress:prs') ?? [];
        this.cache.invalidate('archived');
        this.cache.set(
          'progress:prs',
          prev.filter((r) => r.id !== id),
          ['progress']
        );
      })
    );
  }

  archivePersonalRecord(id: string): Observable<PersonalRecord> {
    return this.http
      .post<PersonalRecord>(`${this.base}/progress/personal-records/${id}/archive`, {})
      .pipe(tap(() => this.cache.invalidate('progress', 'archived')));
  }

  listMeals(date?: string): Observable<Meal[]> {
    const q = date ? `?date=${date}` : '';
    const key = date ? `nutrition:meals:${date}` : 'nutrition:meals';
    return this.cached(key, ['nutrition'], () =>
      this.http.get<Meal[]>(`${this.base}/nutrition/meals${q}`)
    );
  }

  createMeal(body: MealRequest): Observable<Meal> {
    return this.http
      .post<Meal>(`${this.base}/nutrition/meals`, body)
      .pipe(tap(() => this.cache.invalidate('nutrition')));
  }

  deleteMeal(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/nutrition/meals/${id}`)
      .pipe(tap(() => this.cache.invalidate('nutrition')));
  }

  listWater(date?: string): Observable<WaterLog[]> {
    const q = date ? `?date=${date}` : '';
    const key = date ? `nutrition:water:${date}` : 'nutrition:water';
    return this.cached(key, ['nutrition'], () =>
      this.http.get<WaterLog[]>(`${this.base}/water${q}`)
    );
  }

  createWater(body: WaterLogRequest): Observable<WaterLog> {
    return this.http
      .post<WaterLog>(`${this.base}/water`, body)
      .pipe(tap(() => this.cache.invalidate('nutrition')));
  }

  deleteWater(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/water/${id}`)
      .pipe(tap(() => this.cache.invalidate('nutrition')));
  }

  getNutritionTargets(): Observable<NutritionTarget> {
    return this.cached('nutrition:targets', ['nutrition'], () =>
      this.http.get<NutritionTarget>(`${this.base}/nutrition/targets`)
    );
  }

  upsertNutritionTargets(body: NutritionTargetRequest): Observable<NutritionTarget> {
    return this.http
      .put<NutritionTarget>(`${this.base}/nutrition/targets`, body)
      .pipe(
        tap((targets) => {
          this.cache.invalidate('nutrition');
          this.cache.set('nutrition:targets', targets, ['nutrition']);
        })
      );
  }

  getFoodLibraryMeta(): Observable<FoodLibraryMeta> {
    return this.cached('nutrition:foods:meta', ['nutrition'], () =>
      this.http.get<FoodLibraryMeta>(`${this.base}/nutrition/foods/meta`)
    );
  }

  searchFoods(options?: {
    q?: string;
    category?: string;
    region?: string;
  }): Observable<FoodItem[]> {
    const params = new URLSearchParams();
    if (options?.q?.trim()) {
      params.set('q', options.q.trim());
    }
    if (options?.category) {
      params.set('category', options.category);
    }
    if (options?.region) {
      params.set('region', options.region);
    }
    const qs = params.toString();
    return this.http.get<FoodItem[]>(`${this.base}/nutrition/foods${qs ? `?${qs}` : ''}`);
  }

  createFood(body: FoodItemRequest): Observable<FoodItem> {
    return this.http
      .post<FoodItem>(`${this.base}/nutrition/foods`, body)
      .pipe(tap(() => this.cache.invalidate('nutrition')));
  }

  deleteFood(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/nutrition/foods/${id}`)
      .pipe(tap(() => this.cache.invalidate('nutrition')));
  }

  getExerciseLibraryMeta(): Observable<ExerciseLibraryMeta> {
    return this.cached('library:meta', ['library'], () =>
      this.http.get<ExerciseLibraryMeta>(`${this.base}/exercises/meta`)
    );
  }

  listLibraryExercises(options?: {
    page?: number;
    size?: number;
    q?: string;
    muscleGroup?: string;
    equipment?: string;
  }): Observable<PageResponse<LibraryExercise>> {
    const params = new URLSearchParams({
      page: String(options?.page ?? 0),
      size: String(options?.size ?? 24)
    });
    if (options?.q?.trim()) {
      params.set('q', options.q.trim());
    }
    if (options?.muscleGroup) {
      params.set('muscleGroup', options.muscleGroup);
    }
    if (options?.equipment) {
      params.set('equipment', options.equipment);
    }
    const qs = params.toString();
    return this.cached(`library:list:${qs}`, ['library'], () =>
      this.http.get<PageResponse<LibraryExercise>>(`${this.base}/exercises?${qs}`)
    );
  }

  getLibraryExercise(id: string): Observable<LibraryExercise> {
    return this.cached(`library:item:${id}`, ['library'], () =>
      this.http.get<LibraryExercise>(`${this.base}/exercises/${id}`)
    );
  }

  createLibraryExercise(body: LibraryExerciseRequest): Observable<LibraryExercise> {
    return this.http
      .post<LibraryExercise>(`${this.base}/exercises`, body)
      .pipe(tap(() => this.cache.invalidate('library')));
  }

  updateLibraryExercise(id: string, body: LibraryExerciseRequest): Observable<LibraryExercise> {
    return this.http
      .put<LibraryExercise>(`${this.base}/exercises/${id}`, body)
      .pipe(tap((exercise) => {
        this.cache.invalidate('library');
        this.cache.set(`library:item:${id}`, exercise, ['library']);
      }));
  }

  deleteLibraryExercise(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/exercises/${id}`)
      .pipe(tap(() => this.cache.invalidate('library')));
  }

  listNotifications(options?: {
    page?: number;
    size?: number;
    unreadOnly?: boolean;
  }): Observable<PageResponse<NotificationItem>> {
    const page = options?.page ?? 0;
    const size = options?.size ?? 20;
    const unreadOnly = options?.unreadOnly ?? false;
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      unreadOnly: String(unreadOnly)
    });
    const qs = params.toString();
    return this.cached(`notifications:list:${qs}`, ['notifications'], () =>
      this.http.get<PageResponse<NotificationItem>>(`${this.base}/notifications?${qs}`)
    );
  }

  unreadCount(): Observable<{ unreadCount: number }> {
    // Always fresh — shell badge and inbox depend on live counts
    return this.http.get<{ unreadCount: number }>(
      `${this.base}/notifications/unread-count`
    );
  }

  markRead(id: string): Observable<NotificationItem> {
    return this.http
      .put<NotificationItem>(`${this.base}/notifications/${id}/read`, {})
      .pipe(tap(() => this.cache.invalidate('notifications')));
  }

  markAllRead(): Observable<{ unreadCount: number }> {
    return this.http
      .post<{ unreadCount: number }>(`${this.base}/notifications/read-all`, {})
      .pipe(
        tap((result) => {
          this.cache.invalidate('notifications');
          this.cache.set('notifications:unread', result, ['notifications']);
        })
      );
  }

  deleteNotification(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/notifications/${id}`)
      .pipe(tap(() => this.cache.invalidate('notifications')));
  }

  clearAllNotifications(): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/notifications/all`)
      .pipe(tap(() => this.cache.invalidate('notifications')));
  }

  private cached<T>(key: string, scopes: CacheScope[], loader: () => Observable<T>): Observable<T> {
    return this.cache.getOrLoad(key, scopes, loader);
  }

  private afterWorkoutWrite(workout: Workout): void {
    this.cache.invalidate('workouts', 'notifications');
    this.cache.set(`workouts:item:${workout.id}`, workout, ['workouts']);
  }

  private afterPlanWrite(plan: WorkoutPlan): void {
    this.cache.invalidate('workout-plans');
    this.cache.set(`plans:item:${plan.id}`, plan, ['workout-plans']);
  }
}