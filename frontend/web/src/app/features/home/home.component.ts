import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { HomeDashboardData, HomeDashboardService } from '../../core/home-dashboard.service';
import { AchievementsService, AchievementsSnapshot } from '../../core/achievements.service';
import { MotivationalQuote, MotivationalQuoteService } from '../../core/motivational-quote.service';
import { ToastService } from '../../core/toast.service';
import { NotificationBadgeService } from '../../core/notification-badge.service';
import {
  Meal,
  NotificationItem,
  PersonalRecord,
  StrengthExerciseSummary,
  UserProfile,
  WaterLog,
  WeightLog,
  Workout
} from '../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, DatePipe],
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
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
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
    return this.workouts().filter((w) => {
      const d = new Date(w.workoutDate);
      return !Number.isNaN(d.getTime()) && d >= start;
    });
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
        if (!data.workouts.length && !data.profile) {
          this.error.set('Some data could not load. Check that the gateway is running.');
        } else {
          this.error.set(null);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load your dashboard. Is the gateway running?');
      }
    });
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
