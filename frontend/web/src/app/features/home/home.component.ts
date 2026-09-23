import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { HomeDashboardData, HomeDashboardService } from '../../core/home-dashboard.service';
import { AchievementsService, AchievementsSnapshot } from '../../core/achievements.service';
import { MotivationalQuote, MotivationalQuoteService } from '../../core/motivational-quote.service';
import { ToastService } from '../../core/toast.service';
import { NotificationBadgeService } from '../../core/notification-badge.service';
import { StepsPlatformService } from '../../core/steps-platform.service';
import {
  Meal,
  NotificationItem,
  PersonalRecord,
  StrengthExerciseSummary,
  StepLog,
  UserProfile,
  WaterLog,
  WeightLog,
  Workout
} from '../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dashboard = inject(HomeDashboardService);
  private readonly achievementsApi = inject(AchievementsService);
  private readonly quotes = inject(MotivationalQuoteService);
  private readonly toast = inject(ToastService);
  private readonly badge = inject(NotificationBadgeService);
  private readonly stepsPlatform = inject(StepsPlatformService);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly needsOnboarding = signal(false);
  readonly quote = signal<MotivationalQuote | null>(null);
  readonly quoteLoading = signal(true);

  readonly profile = signal<UserProfile | null>(null);
  readonly workouts = signal<Workout[]>([]);
  readonly notes = signal<NotificationItem[]>([]);
  readonly meals = signal<Meal[]>([]);
  readonly water = signal<WaterLog[]>([]);
  readonly weights = signal<WeightLog[]>([]);
  readonly records = signal<PersonalRecord[]>([]);
  readonly strength = signal<StrengthExerciseSummary[]>([]);
  readonly stepsToday = signal<StepLog | null>(null);
  readonly stepHistory = signal<StepLog[]>([]);
  readonly stepsBusy = signal(false);
  readonly manualSteps = signal('');
  readonly addingSteps = signal(false);

  readonly unreadBadge = signal(0);

  readonly today = new Date();
  readonly todayKey = this.toDateKey(this.today);

  readonly displayName = computed(() => {
    const fromProfile = this.profile()?.displayName?.trim();
    if (fromProfile) {
      return fromProfile.split(/\s+/)[0];
    }
    const user = this.auth.user();
    const fromAuth = user?.displayName?.trim() || user?.email?.split('@')[0];
    return fromAuth || 'Athlete';
  });

  readonly greeting = computed(() => {
    const hour = this.today.getHours();
    if (hour < 12) {
      return 'Good morning';
    }
    if (hour < 17) {
      return 'Good afternoon';
    }
    return 'Good evening';
  });

  readonly weekWorkouts = computed(() => {
    const start = this.startOfWeek(this.today);
    const key = this.toDateKey(start);
    return this.workouts().filter((w) => (w.workoutDate?.slice(0, 10) ?? '') >= key);
  });

  readonly weekMinutes = computed(() =>
    this.weekWorkouts().reduce((sum, w) => sum + (w.durationMinutes ?? 0), 0)
  );

  readonly weekWorkoutCalories = computed(() =>
    this.weekWorkouts().reduce((sum, w) => sum + (w.caloriesBurned ?? 0), 0)
  );

  readonly weekStepCalories = computed(() => {
    const startKey = this.toDateKey(this.startOfWeek(this.today));
    return this.stepHistory()
      .filter((s) => s.recordedOn >= startKey && s.recordedOn <= this.todayKey)
      .reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0);
  });

  /** Workouts + steps for the current week. */
  readonly weekCalories = computed(
    () => this.weekWorkoutCalories() + this.weekStepCalories()
  );

  readonly todayCalories = computed(() =>
    this.meals().reduce((sum, m) => sum + (m.calories ?? 0), 0)
  );

  readonly todayWaterMl = computed(() =>
    this.water().reduce((sum, w) => sum + (w.amountMl ?? 0), 0)
  );

  readonly unreadCount = computed(() => this.unreadBadge());

  readonly recentWorkouts = computed(() => this.workouts().slice(0, 5));
  readonly recentNotes = computed(() => this.notes().slice(0, 4));
  readonly latestWeight = computed(() => this.weights()[0] ?? null);
  readonly latestPr = computed(() => this.records()[0] ?? null);

  readonly streakDays = computed(() => this.computeStreak(this.workouts()));

  readonly todaySteps = computed(() => this.stepsToday()?.steps ?? 0);
  readonly todayStepCalories = computed(() => this.stepsToday()?.caloriesBurned ?? 0);
  readonly stepGoal = 8000;
  readonly stepProgressPct = computed(() =>
    Math.min(100, Math.round((this.todaySteps() / this.stepGoal) * 100))
  );

  readonly todayWorkoutCalories = computed(() =>
    this.workouts()
      .filter((w) => (w.workoutDate?.slice(0, 10) ?? '') === this.todayKey)
      .reduce((sum, w) => sum + (w.caloriesBurned ?? 0), 0)
  );

  readonly todayTotalBurn = computed(
    () => this.todayWorkoutCalories() + this.todayStepCalories()
  );

  readonly stepHistoryRows = computed(() => {
    const byDay = new Map(this.stepHistory().map((s) => [s.recordedOn, s]));
    const rows: Array<{
      date: string;
      steps: number;
      calories: number;
      source: string;
      pct: number;
    }> = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(this.today);
      d.setDate(d.getDate() - i);
      const key = this.toDateKey(d);
      const log = byDay.get(key);
      const steps = log?.steps ?? 0;
      rows.push({
        date: key,
        steps,
        calories: log?.caloriesBurned ?? 0,
        source: log ? this.sourceLabel(log) : '—',
        pct: steps ? Math.min(100, Math.round((steps / this.stepGoal) * 100)) : 0
      });
    }
    return rows;
  });

  readonly achievements = computed<AchievementsSnapshot>(() =>
    this.achievementsApi.build({
      workouts: this.workouts(),
      records: this.records(),
      strength: this.strength(),
      today: this.today
    })
  );

  readonly focusLine = computed(() => {
    const goal = this.profile()?.fitnessGoal;
    switch (goal) {
      case 'LOSE_WEIGHT':
        return 'Stay consistent — deficit days compound.';
      case 'BUILD_MUSCLE':
        return 'Hit your lifts, then recover hard.';
      case 'ENDURANCE':
        return 'Stack steady minutes this week.';
      case 'STAY_FIT':
        return 'A short session still counts.';
      case 'GENERAL_HEALTH':
        return 'Move today. Future you will thank you.';
      default:
        return 'Log something small — momentum beats perfection.';
    }
  });

  ngOnInit(): void {
    this.quotes.load().subscribe({
      next: (q) => {
        this.quote.set(q);
        this.quoteLoading.set(false);
      },
      error: () => {
        this.quoteLoading.set(false);
      }
    });

    this.dashboard.load(this.todayKey).subscribe({
      next: (data) => {
        this.apply(data);
        this.loading.set(false);
        this.needsOnboarding.set(data.profileMissing);
        if (data.profileMissing) {
          this.error.set(null);
        } else if (data.profileUnavailable) {
          this.error.set('Could not load your profile. Check your connection and try again.');
        } else {
          this.error.set(null);
        }
        void this.syncPlatformSteps();
      },
      error: () => {
        this.loading.set(false);
        this.needsOnboarding.set(false);
        this.error.set('Could not load your dashboard. Check your connection and try again.');
      }
    });
  }

  /** Pull phone/wearable steps from Health Connect when sync is enabled. */
  private async syncPlatformSteps(): Promise<void> {
    if (
      !this.stepsPlatform.deviceSyncEnabled() &&
      !this.stepsPlatform.wearableSyncEnabled()
    ) {
      return;
    }
    try {
      const sample = await this.stepsPlatform.readPreferredTodaySteps();
      if (!sample || sample.steps <= 0) {
        return;
      }
      const current = this.todaySteps();
      // Never clobber a higher manual/server total with a lower sensor reading.
      if (sample.steps <= current && this.stepsToday()?.source === 'MANUAL') {
        return;
      }
      if (sample.steps === current && this.stepsToday()?.source === sample.source) {
        return;
      }
      if (sample.steps < current) {
        return;
      }
      this.api
        .upsertSteps({
          recordedOn: this.todayKey,
          steps: sample.steps,
          source: sample.source,
          sourceLabel: sample.sourceLabel,
          weightKg: this.weightForSteps()
        })
        .subscribe({
          next: (log) => this.applyStepLog(log),
          error: () => undefined
        });
    } catch {
      /* ignore — permissions / Health Connect */
    }
  }

  cancelAddSteps(): void {
    this.addingSteps.set(false);
    this.manualSteps.set('');
  }

  onManualStepsChange(value: string | number | null): void {
    if (value == null || value === '') {
      this.manualSteps.set('');
      return;
    }
    this.manualSteps.set(String(value));
  }

  addManualSteps(): void {
    this.adjustManualSteps(1);
  }

  removeManualSteps(): void {
    this.adjustManualSteps(-1);
  }

  /** deltaSign +1 adds to today’s total; −1 subtracts (floors at 0). */
  private adjustManualSteps(deltaSign: 1 | -1): void {
    const raw = String(this.manualSteps()).trim();
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0 || raw === '') {
      this.toast.error(deltaSign > 0 ? 'Enter steps to add' : 'Enter steps to remove');
      return;
    }
    const delta = Math.round(amount) * deltaSign;
    const current = this.todaySteps();
    if (delta < 0 && current <= 0) {
      this.toast.error('No steps to remove today');
      return;
    }
    const total = Math.max(0, current + delta);
    const applied = total - current;
    if (applied === 0) {
      this.toast.error(
        delta < 0
          ? `Can only remove up to ${current.toLocaleString()} steps`
          : 'Nothing to change'
      );
      return;
    }
    this.stepsBusy.set(true);
    this.api
      .upsertSteps({
        recordedOn: this.todayKey,
        steps: total,
        source: 'MANUAL',
        sourceLabel: 'Manual',
        weightKg: this.weightForSteps()
      })
      .subscribe({
        next: (log) => {
          this.applyStepLog(log);
          this.manualSteps.set('');
          this.addingSteps.set(false);
          const verb = applied > 0 ? 'Added' : 'Removed';
          this.toast.success(
            `${verb} ${Math.abs(applied).toLocaleString()} steps · ${log.caloriesBurned} kcal today`
          );
          this.stepsBusy.set(false);
        },
        error: (err: { error?: { detail?: string; message?: string } }) => {
          const detail = err?.error?.detail || err?.error?.message;
          this.toast.error(detail || (deltaSign > 0 ? 'Could not add steps' : 'Could not remove steps'));
          this.stepsBusy.set(false);
        }
      });
  }

  private weightForSteps(): number | null {
    const fromProfile = this.profile()?.weightKg;
    if (fromProfile != null && Number(fromProfile) > 0) {
      return Number(fromProfile);
    }
    const fromLog = this.latestWeight()?.weightKg;
    if (fromLog != null && Number(fromLog) > 0) {
      return Number(fromLog);
    }
    return null;
  }

  private applyStepLog(log: StepLog): void {
    this.stepsToday.set(log);
    this.stepHistory.update((rows) => {
      const rest = rows.filter((r) => r.recordedOn !== log.recordedOn);
      return [log, ...rest].sort((a, b) => b.recordedOn.localeCompare(a.recordedOn));
    });
  }

  sourceLabel(log: StepLog): string {
    if (log.sourceLabel) {
      return log.sourceLabel;
    }
    switch (log.source) {
      case 'DEVICE':
        return 'Phone';
      case 'WEARABLE':
        return 'Wearable';
      default:
        return 'Manual';
    }
  }

  markRead(id: string): void {
    this.api.markRead(id).subscribe({
      next: () => {
        this.notes.update((rows) => rows.filter((n) => n.id !== id));
        this.unreadBadge.update((n) => Math.max(0, n - 1));
        this.badge.adjust(-1);
      },
      error: () => this.toast.error('Could not update notification')
    });
  }

  clearAlert(id: string): void {
    this.api.deleteNotification(id).subscribe({
      next: () => {
        this.notes.update((rows) => rows.filter((n) => n.id !== id));
        this.unreadBadge.update((n) => Math.max(0, n - 1));
        this.badge.adjust(-1);
      },
      error: () => this.toast.error('Could not clear alert')
    });
  }

  goalLabel(goal: string | null | undefined): string {
    switch (goal) {
      case 'LOSE_WEIGHT':
        return 'Lose weight';
      case 'BUILD_MUSCLE':
        return 'Build muscle';
      case 'ENDURANCE':
        return 'Endurance';
      case 'STAY_FIT':
        return 'Stay fit';
      case 'GENERAL_HEALTH':
        return 'General health';
      default:
        return 'Set a goal';
    }
  }

  isTierReached(step: string, currentLabel: string): boolean {
    const order = ['Beginner', 'Consistent', 'Dedicated', 'Advanced', 'Elite'];
    return order.indexOf(step) <= order.indexOf(currentLabel);
  }

  private apply(data: HomeDashboardData): void {
    this.profile.set(data.profile);
    this.workouts.set(data.workouts);
    this.notes.set(data.notes);
    this.unreadBadge.set(data.unreadCount);
    this.badge.set(data.unreadCount);
    this.meals.set(data.meals);
    this.water.set(data.water);
    this.weights.set(data.weights);
    this.records.set(data.records);
    this.strength.set(data.strength ?? []);
    this.stepsToday.set(data.stepsToday);
    this.stepHistory.set(data.stepHistory ?? []);
  }

  private toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return d;
  }

  private computeStreak(workouts: Workout[]): number {
    if (!workouts.length) {
      return 0;
    }
    const days = new Set(
      workouts
        .map((w) => w.workoutDate?.slice(0, 10))
        .filter((v): v is string => !!v)
    );
    let streak = 0;
    const cursor = new Date(this.today);
    cursor.setHours(0, 0, 0, 0);

    if (!days.has(this.toDateKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
      if (!days.has(this.toDateKey(cursor))) {
        return 0;
      }
    }

    while (days.has(this.toDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }
}
