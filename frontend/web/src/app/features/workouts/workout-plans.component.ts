import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ActiveWorkoutSessionService } from '../../core/active-workout-session.service';
import { AndroidBackButtonService } from '../../core/android-back-button.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { PlanTemplateType, Weekday, WorkoutPlan, WorkoutPlanDay } from '../../core/models';

const WEEKDAY_SHORT: Record<Weekday, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun'
};

const WEEKDAYS: Weekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
];

@Component({
  selector: 'app-workout-plans',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './workout-plans.component.html',
  styleUrl: './workout-plans.component.scss'
})
export class WorkoutPlansComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly session = inject(ActiveWorkoutSessionService);
  private readonly router = inject(Router);
  private readonly androidBack = inject(AndroidBackButtonService);
  private readonly destroyRef = inject(DestroyRef);

  readonly plans = signal<WorkoutPlan[]>([]);
  readonly error = signal<string | null>(null);
  readonly seeding = signal(false);
  readonly pendingTemplate = signal<Exclude<PlanTemplateType, 'CUSTOM'> | null>(null);
  readonly restPick = signal<Weekday>('SUNDAY');
  readonly weekdayOptions = WEEKDAYS;
  readonly weekdayShort = WEEKDAY_SHORT;

  readonly templates: Array<{
    type: Exclude<PlanTemplateType, 'CUSTOM'>;
    name: string;
    meta: string;
    description: string;
  }> = [
    {
      type: 'PPL',
      name: 'Push / Pull / Legs',
      meta: '6 days · intermediate',
      description: '6 training days — you choose which weekday is rest.'
    },
    {
      type: 'UPPER_LOWER',
      name: 'Upper / Lower',
      meta: '4 days · intermediate',
      description: 'Balanced upper and lower sessions across the week.'
    },
    {
      type: 'FULL_BODY',
      name: 'Full Body',
      meta: '3 days · beginner',
      description: 'Train everything each session — ideal when time is tight.'
    },
    {
      type: 'BRO_SPLIT',
      name: 'Bro Split',
      meta: '5 days · bodybuilding',
      description: 'Chest, back, shoulders, arms, then legs.'
    },
    {
      type: 'ARNOLD',
      name: 'Arnold Split',
      meta: '6 days · advanced',
      description: 'Chest/back, shoulders/arms, and legs twice each.'
    },
    {
      type: 'STRENGTH',
      name: 'Strength Foundations',
      meta: '3 days · strength',
      description: 'A/B days built around squat, bench, and deadlift.'
    }
  ];

  ngOnInit(): void {
    this.destroyRef.onDestroy(
      this.androidBack.registerOverlay(() => {
        if (!this.pendingTemplate()) {
          return false;
        }
        this.cancelSeedPicker();
        return true;
      })
    );
    this.reload();
  }

  reload(): void {
    this.api.listWorkoutPlans().subscribe({
      next: (rows) =>
        this.plans.set(rows.map((p) => ({ ...p, schedule: p.schedule ?? [] }))),
      error: () => this.error.set('Failed to load plans')
    });
  }

  openSeedPicker(template: Exclude<PlanTemplateType, 'CUSTOM'>): void {
    this.pendingTemplate.set(template);
    this.restPick.set('SUNDAY');
  }

  cancelSeedPicker(): void {
    this.pendingTemplate.set(null);
  }

  confirmSeed(): void {
    const template = this.pendingTemplate();
    if (!template || this.seeding()) {
      return;
    }
    this.seeding.set(true);
    this.api.seedWorkoutPlanTemplate(template, this.restPick()).subscribe({
      next: (plan) => {
        this.seeding.set(false);
        this.pendingTemplate.set(null);
        this.toast.success(`${plan.name} added`);
        this.reload();
        void this.router.navigate(['/app/workouts/plans', plan.id]);
      },
      error: () => {
        this.seeding.set(false);
        this.toast.error('Could not create template');
      }
    });
  }

  createCustom(): void {
    this.api
      .createWorkoutPlan({
        name: 'Custom plan',
        templateType: 'CUSTOM',
        description: 'Build your own split',
        days: [{ dayLabel: 'Day 1', exercises: [] }]
      })
      .subscribe({
        next: (plan) => {
          this.toast.success('Custom plan created');
          this.reload();
          void this.router.navigate(['/app/workouts/plans', plan.id]);
        },
        error: () => this.toast.error('Could not create plan')
      });
  }

  async archive(plan: WorkoutPlan, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const ok = await this.confirm.ask({
      title: 'Archive plan',
      message: `Archive “${plan.name}”?`,
      confirmLabel: 'Yes, archive'
    });
    if (!ok) {
      return;
    }
    this.api.archiveWorkoutPlan(plan.id).subscribe({
      next: () => {
        this.reload();
        this.toast.success('Plan archived');
      },
      error: () => this.toast.error('Could not archive plan')
    });
  }

  async remove(plan: WorkoutPlan, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const ok = await this.confirm.ask({
      title: 'Delete plan?',
      message: `Permanently delete “${plan.name}”? This cannot be undone.`,
      confirmLabel: 'Yes, delete',
      danger: true
    });
    if (!ok) {
      return;
    }
    this.api.deleteWorkoutPlan(plan.id).subscribe({
      next: () => {
        this.reload();
        this.toast.success('Plan deleted');
      },
      error: () => this.toast.error('Could not delete plan')
    });
  }

  startDay(plan: WorkoutPlan, dayId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.session.hasSession()) {
      this.toast.error('End the current live session first');
      return;
    }
    this.api.startPlanDay(plan.id, { planDayId: dayId }).subscribe({
      next: (workout) => {
        this.session.start(workout.id, workout.name);
        this.toast.success('Day started — timer is live');
        void this.router.navigate(['/app/workouts', workout.id]);
      },
      error: () => this.toast.error('Could not start plan day')
    });
  }

  dayCount(plan: WorkoutPlan): number {
    return plan.days?.length ?? 0;
  }

  weekSummary(plan: WorkoutPlan): string {
    if (!plan.schedule?.length) {
      return '';
    }
    return plan.schedule
      .map((s) => `${WEEKDAY_SHORT[s.weekday]}→${s.restDay ? 'Rest' : s.dayLabel}`)
      .join(' · ');
  }

  todayTrainingDay(plan: WorkoutPlan): WorkoutPlanDay | null {
    const today = currentWeekday();
    const slot = plan.schedule?.find((s) => s.weekday === today);
    if (!slot || slot.restDay || !slot.planDayId) {
      return null;
    }
    return plan.days.find((d) => d.id === slot.planDayId) ?? null;
  }
}

function currentWeekday(): Weekday {
  const map: Weekday[] = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY'
  ];
  return map[new Date().getDay()];
}
