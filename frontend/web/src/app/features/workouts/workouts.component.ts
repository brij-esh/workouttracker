import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ActiveWorkoutSessionService } from '../../core/active-workout-session.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { canEditWorkout, canResumePausedWorkout, remainingEditDays, workoutStartIso } from '../../core/date-window';
import { Workout } from '../../core/models';
import { DateInputComponent } from '../../shared/date-input.component';
import { WorkoutCalendarComponent } from './workout-calendar.component';

type HistoryView = 'list' | 'calendar';

@Component({
  selector: 'app-workouts',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, WorkoutCalendarComponent, DateInputComponent],
  templateUrl: './workouts.component.html',
  styleUrl: './workouts.component.scss'
})
export class WorkoutsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly session = inject(ActiveWorkoutSessionService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly view = signal<HistoryView>('list');
  readonly rows = signal<Workout[]>([]);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly pageSize = 20;
  readonly page = signal(0);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly hasNext = signal(false);
  readonly hasPrevious = signal(false);
  readonly loading = signal(false);

  readonly historyStats = computed(() => {
    const rows = this.rows();
    let completed = 0;
    let active = 0;
    let minutes = 0;
    let calories = 0;
    for (const w of rows) {
      const status = w.status ?? 'COMPLETED';
      if (status === 'IN_PROGRESS' || (status === 'PAUSED' && canResumePausedWorkout(w))) {
        active += 1;
      } else {
        completed += 1;
      }
      minutes += Number(w.durationMinutes) || 0;
      calories += Number(w.caloriesBurned) || 0;
    }
    return {
      total: this.totalElements(),
      completed,
      active,
      minutes,
      calories
    };
  });

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    workoutDate: [this.localDateKey(), Validators.required],
    durationMinutes: [null as number | null],
    caloriesBurned: [null as number | null]
  });

  ngOnInit(): void {
    this.reload();
  }

  setView(view: HistoryView): void {
    this.view.set(view);
  }

  reload(): void {
    this.loadPage(this.page());
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listWorkoutsPage({ page, size: this.pageSize }).subscribe({
      next: (res) => {
        // Paged API — or fall back if an older server returns a plain array
        if (Array.isArray(res)) {
          this.applyClientPage(res, page);
          return;
        }
        if (res && Array.isArray(res.content)) {
          this.rows.set(res.content);
          this.page.set(res.page ?? page);
          this.totalElements.set(res.totalElements ?? res.content.length);
          this.totalPages.set(res.totalPages ?? 1);
          this.hasNext.set(!!res.hasNext);
          this.hasPrevious.set(!!res.hasPrevious);
          this.loading.set(false);
          this.error.set(null);
          return;
        }
        this.loadFullListFallback(page);
      },
      error: () => this.loadFullListFallback(page)
    });
  }

  private loadFullListFallback(page: number): void {
    this.api.listWorkouts().subscribe({
      next: (rows) => this.applyClientPage(rows ?? [], page),
      error: () => {
        this.loading.set(false);
        this.rows.set([]);
        this.error.set('Failed to load workouts');
      }
    });
  }

  private applyClientPage(all: Workout[], page: number): void {
    const safePage = Math.max(0, page);
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / this.pageSize) || 1);
    const clamped = Math.min(safePage, totalPages - 1);
    const start = clamped * this.pageSize;
    this.rows.set(all.slice(start, start + this.pageSize));
    this.page.set(clamped);
    this.totalElements.set(total);
    this.totalPages.set(totalPages);
    this.hasNext.set(clamped < totalPages - 1);
    this.hasPrevious.set(clamped > 0);
    this.loading.set(false);
    this.error.set(null);
  }

  prevPage(): void {
    if (!this.hasPrevious() || this.loading()) {
      return;
    }
    this.loadPage(this.page() - 1);
  }

  nextPage(): void {
    if (!this.hasNext() || this.loading()) {
      return;
    }
    this.loadPage(this.page() + 1);
  }

  statusClass(row: Workout): string {
    switch (row.status) {
      case 'IN_PROGRESS':
        return 'live';
      case 'PAUSED':
        return canResumePausedWorkout(row) ? 'paused' : 'done';
      default:
        return 'done';
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const id = this.editingId();
    if (!id) {
      return;
    }
    this.api.updateWorkout(id, this.form.getRawValue()).subscribe({
      next: () => {
        this.cancelEdit();
        this.toast.success('Workout updated');
        this.reload();
      },
      error: () => {
        this.error.set('Could not save workout');
        this.toast.error('Could not save workout');
      }
    });
  }

  edit(row: Workout, event: Event): void {
    event.stopPropagation();
    if (!canEditWorkout(row)) {
      this.toast.error('This workout can no longer be edited');
      return;
    }
    this.editingId.set(row.id);
    this.form.setValue({
      name: row.name,
      description: row.description ?? '',
      workoutDate: row.workoutDate,
      durationMinutes: row.durationMinutes,
      caloriesBurned: row.caloriesBurned
    });
    this.view.set('list');
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({
      name: '',
      description: '',
      workoutDate: this.localDateKey(),
      durationMinutes: null,
      caloriesBurned: null
    });
  }

  async remove(row: Workout, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.session.isActiveFor(row.id)) {
      this.toast.error('End the live session before deleting this workout');
      return;
    }
    if (!canEditWorkout(row)) {
      this.toast.error('Older than 5 days — archive instead of delete');
      return;
    }
    const remaining = remainingEditDays(workoutStartIso(row).slice(0, 10));
    const ok = await this.confirm.ask({
      title: 'Confirm delete',
      message: `Delete “${row.name}”? You have ${remaining} day(s) left in the edit window.`,
      meta: `Date: ${row.workoutDate}`,
      confirmLabel: 'Yes, delete',
      danger: true
    });
    if (!ok) {
      return;
    }
    this.api.deleteWorkout(row.id).subscribe({
      next: () => {
        if (this.editingId() === row.id) {
          this.cancelEdit();
        }
        this.reload();
        this.toast.success('Workout deleted');
      },
      error: () => {
        this.error.set('Could not delete workout');
        this.toast.error('Could not delete workout');
      }
    });
  }

  async archive(row: Workout, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.session.isActiveFor(row.id)) {
      this.toast.error('End the live session before archiving this workout');
      return;
    }
    const ok = await this.confirm.ask({
      title: 'Confirm archive',
      message: `Archive “${row.name}”? It will move to Profile → Archived.`,
      meta: `Date: ${row.workoutDate}`,
      confirmLabel: 'Yes, archive'
    });
    if (!ok) {
      return;
    }
    this.api.archiveWorkout(row.id).subscribe({
      next: () => {
        if (this.editingId() === row.id) {
          this.cancelEdit();
        }
        this.reload();
        this.toast.success('Workout archived');
      },
      error: () => this.toast.error('Could not archive workout')
    });
  }

  canDelete(row: Workout): boolean {
    return canEditWorkout(row) && (row.status ?? 'COMPLETED') === 'COMPLETED';
  }

  canEditWorkoutRow(row: Workout): boolean {
    return canEditWorkout(row);
  }

  canShowResume(row: Workout): boolean {
    return (
      this.session.isActiveFor(row.id) ||
      row.status === 'IN_PROGRESS' ||
      canResumePausedWorkout(row)
    );
  }

  statusLabel(row: Workout): string {
    switch (row.status) {
      case 'IN_PROGRESS':
        return 'In progress';
      case 'PAUSED':
        return canResumePausedWorkout(row) ? 'Paused' : 'Completed';
      default:
        return 'Completed';
    }
  }

  openWorkout(row: Workout): void {
    void this.router.navigate(['/app/workouts', row.id]);
  }

  resumeSession(row: Workout, event: Event): void {
    event.stopPropagation();
    if (this.session.hasSession() && !this.session.isActiveFor(row.id)) {
      this.toast.error('End the current live session first');
      return;
    }
    if (this.session.isActiveFor(row.id)) {
      this.session.show();
      void this.router.navigate(['/app/workouts', row.id]);
      return;
    }
    if (row.status === 'COMPLETED') {
      this.toast.error('Completed workouts cannot be resumed');
      return;
    }
    if (row.status === 'PAUSED' && !canResumePausedWorkout(row)) {
      this.api
        .completeWorkout(row.id, {
          durationMinutes: row.durationMinutes ?? 1,
          elapsedMs: row.elapsedMs ?? 0
        })
        .subscribe({
          next: () => {
            this.reload();
            this.toast.error('Pause exceeded 1 hour — marked completed');
          }
        });
      return;
    }
    if (row.status === 'PAUSED') {
      this.api.resumeWorkout(row.id).subscribe({
        next: () => {
          this.session.start(row.id, row.name, row.elapsedMs ?? 0);
          this.toast.success('Session resumed');
          void this.router.navigate(['/app/workouts', row.id]);
        },
        error: () => this.toast.error('Could not resume session')
      });
      return;
    }
    this.session.start(row.id, row.name, row.elapsedMs ?? 0);
    this.toast.success('Session continued');
    void this.router.navigate(['/app/workouts', row.id]);
  }

  private localDateKey(date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
