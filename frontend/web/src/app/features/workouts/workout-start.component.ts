import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ActiveWorkoutSessionService } from '../../core/active-workout-session.service';
import { WorkoutPlan, WorkoutPlanDay } from '../../core/models';

type StartMode = 'custom' | 'plan';

@Component({
  selector: 'app-workout-start',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './workout-start.component.html',
  styleUrl: './workout-start.component.scss'
})
export class WorkoutStartComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly session = inject(ActiveWorkoutSessionService);

  readonly mode = signal<StartMode>('custom');
  readonly plans = signal<WorkoutPlan[]>([]);
  readonly selectedPlanId = signal<string | null>(null);
  readonly starting = signal(false);
  readonly loadingPlans = signal(false);
  readonly error = signal<string | null>(null);
  readonly todayKey = this.localDateKey();

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    durationMinutes: [null as number | null],
    caloriesBurned: [null as number | null]
  });

  readonly selectedPlan = computed(() => {
    const id = this.selectedPlanId();
    return this.plans().find((p) => p.id === id) ?? null;
  });

  readonly planDays = computed(() => this.selectedPlan()?.days ?? []);

  todayLabel(): string {
    return this.todayKey;
  }

  ngOnInit(): void {
    this.loadPlans();
  }

  setMode(mode: StartMode): void {
    this.mode.set(mode);
    this.error.set(null);
    if (mode === 'plan' && !this.plans().length) {
      this.loadPlans();
    }
  }

  loadPlans(): void {
    this.loadingPlans.set(true);
    this.api.listWorkoutPlans().subscribe({
      next: (rows) => {
        this.plans.set(rows);
        if (!this.selectedPlanId() && rows.length) {
          this.selectedPlanId.set(rows[0].id);
        }
        this.loadingPlans.set(false);
      },
      error: () => {
        this.loadingPlans.set(false);
        this.error.set('Failed to load plans');
      }
    });
  }

  selectPlan(planId: string): void {
    this.selectedPlanId.set(planId);
  }

  startCustom(withTimer: boolean): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Enter a workout name to start');
      return;
    }
    if (withTimer && this.session.hasSession()) {
      this.toast.error('End the current live session first');
      return;
    }

    const raw = this.form.getRawValue();
    const body = {
      name: raw.name.trim(),
      description: raw.description?.trim() ? raw.description.trim() : null,
      workoutDate: this.localDateKey(),
      durationMinutes: raw.durationMinutes,
      caloriesBurned: raw.caloriesBurned,
      liveSession: withTimer
    };

    this.starting.set(true);
    this.api.createWorkout(body).subscribe({
      next: (saved) => {
        this.starting.set(false);
        if (withTimer) {
          this.session.start(saved.id, saved.name, saved.elapsedMs ?? 0);
          this.toast.success('Workout started — timer is live');
        } else {
          this.toast.success('Workout saved as completed');
        }
        this.form.reset({
          name: '',
          description: '',
          durationMinutes: null,
          caloriesBurned: null
        });
        void this.router.navigate(['/app/workouts', saved.id]);
      },
      error: (err) => {
        this.starting.set(false);
        const detail =
          (err as { error?: { detail?: string; message?: string } })?.error?.detail ??
          (err as { error?: { message?: string } })?.error?.message ??
          'Could not start workout';
        this.error.set(detail);
        this.toast.error(detail);
      }
    });
  }

  startPlanDay(day: WorkoutPlanDay): void {
    const plan = this.selectedPlan();
    if (!plan) {
      return;
    }
    if (this.session.hasSession()) {
      this.toast.error('End the current live session first');
      return;
    }
    this.starting.set(true);
    this.api.startPlanDay(plan.id, { planDayId: day.id, workoutDate: this.localDateKey() }).subscribe({
      next: (workout) => {
        this.starting.set(false);
        this.session.start(workout.id, workout.name, workout.elapsedMs ?? 0);
        this.toast.success(`${day.dayLabel} started — timer is live`);
        void this.router.navigate(['/app/workouts', workout.id]);
      },
      error: (err) => {
        this.starting.set(false);
        const detail =
          (err as { error?: { detail?: string; message?: string } })?.error?.detail ??
          (err as { error?: { message?: string } })?.error?.message ??
          'Could not start plan day';
        this.toast.error(detail);
      }
    });
  }

  private localDateKey(date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
