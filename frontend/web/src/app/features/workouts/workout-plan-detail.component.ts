import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ActiveWorkoutSessionService } from '../../core/active-workout-session.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { PlanScheduleSlot, Weekday, WorkoutPlan } from '../../core/models';
import { AppSelectOption, SelectComponent } from '../../shared/select.component';
import { FormsModule } from '@angular/forms';

const WEEKDAY_SHORT: Record<Weekday, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun'
};

@Component({
  selector: 'app-workout-plan-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, ReactiveFormsModule, SelectComponent],
  templateUrl: './workout-plan-detail.component.html',
  styleUrl: './workout-plan-detail.component.scss'
})
export class WorkoutPlanDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly session = inject(ActiveWorkoutSessionService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  readonly plan = signal<WorkoutPlan | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);
  readonly starting = signal(false);
  readonly savingSchedule = signal(false);
  readonly editingName = signal(false);
  readonly savingName = signal(false);

  readonly nameForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]]
  });

  readonly weekdayShort = WEEKDAY_SHORT;

  readonly isCustom = computed(() => this.plan()?.templateType === 'CUSTOM');

  dowLabel(day: Weekday): string {
    return WEEKDAY_SHORT[day];
  }

  readonly todayWeekday = computed((): Weekday => {
    const map: Weekday[] = [
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY'
    ];
    // JS: 0=Sun … 6=Sat → convert to Mon-first index
    const js = new Date().getDay();
    return map[js === 0 ? 6 : js - 1];
  });

  readonly todaySlot = computed(() => {
    const plan = this.plan();
    if (!plan?.schedule?.length) {
      return null;
    }
    return plan.schedule.find((s) => s.weekday === this.todayWeekday()) ?? null;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigateByUrl('/app/workouts/plans');
      return;
    }
    this.load(id);
  }

  load(id: string): void {
    this.api.getWorkoutPlan(id).subscribe({
      next: (plan) => {
        this.plan.set({
          ...plan,
          schedule: plan.schedule ?? []
        });
        this.nameForm.patchValue({ name: plan.name });
        this.loading.set(false);
        if (plan.templateType === 'CUSTOM' && plan.name.trim().toLowerCase() === 'custom plan') {
          this.editingName.set(true);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Plan not found');
      }
    });
  }

  startEditName(): void {
    const plan = this.plan();
    if (!plan) {
      return;
    }
    this.nameForm.patchValue({ name: plan.name });
    this.editingName.set(true);
  }

  cancelEditName(): void {
    const plan = this.plan();
    if (plan) {
      this.nameForm.patchValue({ name: plan.name });
    }
    this.editingName.set(false);
  }

  saveName(): void {
    const plan = this.plan();
    if (!plan || this.nameForm.invalid) {
      this.nameForm.markAllAsTouched();
      return;
    }
    const name = this.nameForm.getRawValue().name.trim();
    if (!name) {
      this.toast.error('Enter a plan name');
      return;
    }
    this.savingName.set(true);
    this.api
      .updateWorkoutPlan(plan.id, {
        name,
        description: plan.description
      })
      .subscribe({
        next: (updated) => {
          this.plan.set({
            ...updated,
            schedule: updated.schedule ?? plan.schedule ?? []
          });
          this.savingName.set(false);
          this.editingName.set(false);
          this.toast.success('Plan name updated');
        },
        error: () => {
          this.savingName.set(false);
          this.toast.error('Could not update plan name');
        }
      });
  }

  startDay(dayId: string): void {
    const plan = this.plan();
    if (!plan) {
      return;
    }
    if (this.session.hasSession()) {
      this.toast.error('End the current live session first');
      return;
    }
    this.starting.set(true);
    this.api.startPlanDay(plan.id, { planDayId: dayId }).subscribe({
      next: (workout) => {
        this.starting.set(false);
        this.session.start(workout.id, workout.name);
        this.toast.success('Day started — timer is live');
        void this.router.navigate(['/app/workouts', workout.id]);
      },
      error: () => {
        this.starting.set(false);
        this.toast.error('Could not start plan day');
      }
    });
  }

  startToday(): void {
    const plan = this.plan();
    const slot = this.todaySlot();
    if (!plan || !slot || slot.restDay || !slot.planDayId) {
      this.toast.error('Today is a rest day');
      return;
    }
    this.startDay(slot.planDayId);
  }

  onScheduleChange(weekday: Weekday, value: string): void {
    const plan = this.plan();
    if (!plan) {
      return;
    }
    const planDayId = value === '' || value === 'REST' ? null : value;
    const nextSchedule = (plan.schedule?.length
      ? plan.schedule
      : emptyWeekSchedule()
    ).map((slot) => {
      if (slot.weekday !== weekday) {
        return slot;
      }
      const day = plan.days.find((d) => d.id === planDayId);
      return {
        weekday,
        planDayId,
        dayLabel: day?.dayLabel ?? 'Rest',
        restDay: planDayId == null
      } satisfies PlanScheduleSlot;
    });

    this.savingSchedule.set(true);
    this.api
      .updatePlanSchedule(plan.id, {
        schedule: nextSchedule.map((s) => ({
          weekday: s.weekday,
          planDayId: s.planDayId
        }))
      })
      .subscribe({
        next: (updated) => {
          this.savingSchedule.set(false);
          this.plan.set({ ...updated, schedule: updated.schedule ?? [] });
          this.toast.success('Week schedule updated');
        },
        error: () => {
          this.savingSchedule.set(false);
          this.toast.error('Could not update schedule');
        }
      });
  }

  async remove(): Promise<void> {
    const plan = this.plan();
    if (!plan) {
      return;
    }
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
        this.toast.success('Plan deleted');
        void this.router.navigateByUrl('/app/workouts/plans');
      },
      error: () => this.toast.error('Could not delete plan')
    });
  }

  scheduleOptions(plan: WorkoutPlan): AppSelectOption[] {
    return [
      { value: 'REST', label: 'Rest' },
      ...plan.days.map((day) => ({ value: day.id, label: day.dayLabel }))
    ];
  }
}

function emptyWeekSchedule(): PlanScheduleSlot[] {
  const days: Weekday[] = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY'
  ];
  return days.map((weekday) => ({
    weekday,
    planDayId: null,
    dayLabel: 'Rest',
    restDay: true
  }));
}
