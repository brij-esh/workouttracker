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
  StepSource,
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
  readonly stepsPlatform = inject(StepsPlatformService);
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

  readonly unreadBadge = signal(0);

  readonly today = new Date();
  readonly todayKey = this.toDateKey(this.today);
  readonly stepsCapability = this.stepsPlatform.capability();

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

  readonly weekCalories = computed(() =>
    this.weekWorkouts().reduce((sum, w) => sum + (w.caloriesBurned ?? 0), 0)
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
      },
      error: () => {
        this.loading.set(false);
        this.needsOnboarding.set(false);
        this.error.set('Could not load your dashboard. Check your connection and try again.');
      }
    });
  }

  async connectPhone(): Promise<void> {
    this.stepsBusy.set(true);
    try {
      const state = await this.stepsPlatform.requestDevicePermission();
      if (state === 'unsupported') {
        this.toast.error(
          'This browser cannot read phone Health data. Log steps manually, or use a native app build with Health access.'
        );
        return;
      }
      if (state !== 'granted') {
        this.toast.error('Phone step access was denied');
        return;
      }
      await this.syncFrom('DEVICE');
    } finally {
      this.stepsBusy.set(false);
    }
  }

  async connectWearable(): Promise<void> {
    this.stepsBusy.set(true);
    try {
      const state = await this.stepsPlatform.requestWearablePermission();
      if (state === 'denied') {
        this.toast.error('Wearable access was denied');
        return;
      }
      this.toast.success('Wearable permission saved — sync when your watch bridge is available');
      await this.syncFrom('WEARABLE');
    } finally {
      this.stepsBusy.set(false);
    }
  }

  async syncFrom(source: 'DEVICE' | 'WEARABLE'): Promise<void> {
    this.stepsBusy.set(true);
    try {
      const sample = await this.stepsPlatform.readTodaySteps(source);
      if (!sample) {
        this.toast.error(
          source === 'WEARABLE'
            ? 'No wearable steps yet — connect a native health bridge or enter steps manually'
            : 'No phone steps available here — enter today’s count manually'
        );
        return;
      }
      await this.saveSteps(sample.steps, sample.source, sample.sourceLabel);
    } finally {
      this.stepsBusy.set(false);
    }
  }

  saveManualSteps(): void {
    const raw = this.manualSteps().trim();
    const steps = Number(raw);
    if (!Number.isFinite(steps) || steps < 0) {
      this.toast.error('Enter a valid step count');
      return;
    }
    this.stepsBusy.set(true);
    void this.saveSteps(Math.round(steps), 'MANUAL', 'Manual')
      .catch(() => undefined)
      .finally(() => this.stepsBusy.set(false));
  }

  private saveSteps(steps: number, source: StepSource, sourceLabel: string): Promise<void> {
    const weightKg = this.profile()?.weightKg ?? this.latestWeight()?.weightKg ?? null;
    return new Promise((resolve, reject) => {
      this.api
        .upsertSteps({
          recordedOn: this.todayKey,
          steps,
          source,
          sourceLabel,
          weightKg: weightKg != null ? Number(weightKg) : null
        })
        .subscribe({
          next: (log) => {
            this.stepsToday.set(log);
            this.stepHistory.update((rows) => {
              const rest = rows.filter((r) => r.recordedOn !== log.recordedOn);
              return [log, ...rest].sort((a, b) => b.recordedOn.localeCompare(a.recordedOn));
            });
            this.manualSteps.set(String(log.steps));
            this.toast.success(`Steps updated · ${log.caloriesBurned} kcal`);
            resolve();
          },
          error: () => {
            this.toast.error('Could not save steps');
            reject(new Error('save failed'));
          }
        });
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
        this.toast.success('Marked as read');
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
        this.toast.success('Alert cleared');
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
    if (data.stepsToday) {
      this.manualSteps.set(String(data.stepsToday.steps));
    }
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
