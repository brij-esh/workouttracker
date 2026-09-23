import { Component, DestroyRef, HostListener, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ActiveWorkoutSessionService } from '../../core/active-workout-session.service';
import { AndroidBackButtonService } from '../../core/android-back-button.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { RestTimerService } from '../../core/rest-timer.service';
import { WorkoutCalorieService } from '../../core/workout-calorie.service';
import {
  canEditWorkout,
  canResumePausedWorkout,
  remainingEditDays,
  workoutStartIso
} from '../../core/date-window';
import { ExercisePreviousPerformance, ExerciseSet, Workout, WorkoutExercise } from '../../core/models';

@Component({
  selector: 'app-workout-detail',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, RouterLink],
  templateUrl: './workout-detail.component.html',
  styleUrl: './workout-detail.component.scss'
})
export class WorkoutDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  readonly session = inject(ActiveWorkoutSessionService);
  readonly rest = inject(RestTimerService);
  private readonly confirmDlg = inject(ConfirmDialogService);
  private readonly calories = inject(WorkoutCalorieService);
  private readonly androidBack = inject(AndroidBackButtonService);
  private readonly destroyRef = inject(DestroyRef);

  readonly workout = signal<Workout | null>(null);
  readonly exercises = signal<WorkoutExercise[]>([]);
  readonly setsByExercise = signal<Record<string, ExerciseSet[]>>({});
  readonly previousByExercise = signal<Record<string, ExercisePreviousPerformance>>({});
  readonly expandedExerciseId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);
  readonly modalOpen = signal(false);
  readonly editingExerciseId = signal<string | null>(null);
  readonly saving = signal(false);

  readonly canEdit = computed(() => {
    const w = this.workout();
    return w ? canEditWorkout(w) : false;
  });

  readonly canResume = computed(() => {
    const w = this.workout();
    return w ? canResumePausedWorkout(w) : false;
  });

  readonly statusLabel = computed(() => {
    const w = this.workout();
    switch (w?.status) {
      case 'IN_PROGRESS':
        return 'In progress';
      case 'PAUSED':
        return this.canResume() ? 'Paused' : 'Completed (pause expired)';
      case 'COMPLETED':
        return 'Completed';
      default:
        return 'Completed';
    }
  });

  readonly exerciseForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    notes: ['']
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(
      this.androidBack.registerOverlay(() => {
        if (!this.modalOpen()) {
          return false;
        }
        this.closeModal();
        return true;
      })
    );
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigateByUrl('/app/workouts');
      return;
    }
    this.load(id);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalOpen()) {
      this.closeModal();
    }
  }

  load(id: string): void {
    this.loading.set(true);
    this.api.getWorkout(id).subscribe({
      next: (workout) => {
        this.workout.set(workout);
        this.maybeAttachSession(workout);
        this.loadExercises(id);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Workout not found.');
      }
    });
  }

  loadExercises(workoutId: string): void {
    this.api.listExercises(workoutId).subscribe({
      next: (rows) => {
        this.exercises.set(rows);
        this.loading.set(false);
        for (const ex of rows) {
          this.loadSets(workoutId, ex.id);
          this.loadPrevious(workoutId, ex.id);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load exercises.');
      }
    });
  }

  loadSets(workoutId: string, exerciseId: string): void {
    this.api.listExerciseSets(workoutId, exerciseId).subscribe({
      next: (sets) => {
        this.setsByExercise.update((map) => ({ ...map, [exerciseId]: sets }));
      }
    });
  }

  loadPrevious(workoutId: string, exerciseId: string): void {
    this.api.getExercisePreviousPerformance(workoutId, exerciseId).subscribe({
      next: (prev) => {
        this.previousByExercise.update((map) => ({ ...map, [exerciseId]: prev }));
      }
    });
  }

  toggleSets(exerciseId: string): void {
    this.expandedExerciseId.update((id) => (id === exerciseId ? null : exerciseId));
  }

  setsFor(exerciseId: string): ExerciseSet[] {
    return this.setsByExercise()[exerciseId] ?? [];
  }

  previousFor(exerciseId: string): ExercisePreviousPerformance | null {
    return this.previousByExercise()[exerciseId] ?? null;
  }

  formatPrevSet(set: { weightKg: number | null; reps: number | null }): string {
    const kg = set.weightKg != null ? `${set.weightKg} kg` : '— kg';
    const reps = set.reps != null ? String(set.reps) : '—';
    return `${kg} × ${reps}`;
  }

  addSet(ex: WorkoutExercise): void {
    const workoutId = this.workout()?.id;
    if (!workoutId || !this.canEdit()) {
      this.toast.error('This workout can no longer be edited');
      return;
    }
    const existing = this.setsFor(ex.id);
    const last = existing[existing.length - 1];
    const prev = this.previousFor(ex.id);
    const target = prev?.found ? prev.target : null;
    this.api
      .createExerciseSet(workoutId, ex.id, {
        setNumber: existing.length + 1,
        reps: last?.reps ?? target?.reps ?? null,
        weightKg: last?.weightKg ?? target?.weightKg ?? null,
        completed: false,
        restSeconds: last?.restSeconds ?? 90
      })
      .subscribe({
        next: () => {
          this.loadSets(workoutId, ex.id);
          this.loadExercises(workoutId);
          this.expandedExerciseId.set(ex.id);
        },
        error: () => this.toast.error('Could not add set')
      });
  }

  updateSetField(
    ex: WorkoutExercise,
    set: ExerciseSet,
    field: 'reps' | 'weightKg' | 'restSeconds',
    value: string
  ): void {
    const workoutId = this.workout()?.id;
    if (!workoutId || !this.canEdit()) {
      return;
    }
    const parsed = value === '' ? null : Number(value);
    if (parsed != null && Number.isNaN(parsed)) {
      return;
    }
    this.api
      .updateExerciseSet(workoutId, ex.id, set.id, { [field]: parsed })
      .subscribe({
        next: () => {
          this.loadSets(workoutId, ex.id);
          this.loadExercises(workoutId);
        },
        error: () => this.toast.error('Could not update set')
      });
  }

  toggleComplete(ex: WorkoutExercise, set: ExerciseSet): void {
    const workoutId = this.workout()?.id;
    if (!workoutId || !this.canEdit()) {
      return;
    }
    const next = !set.completed;
    this.api
      .updateExerciseSet(workoutId, ex.id, set.id, { completed: next })
      .subscribe({
        next: () => {
          this.loadSets(workoutId, ex.id);
          if (next) {
            const rest = set.restSeconds ?? 90;
            this.rest.start(rest, `${ex.name} · set ${set.setNumber}`);
          }
        },
        error: () => this.toast.error('Could not update set')
      });
  }

  startRest(ex: WorkoutExercise, set: ExerciseSet): void {
    this.rest.start(set.restSeconds ?? 90, `${ex.name} · set ${set.setNumber}`);
  }

  removeSet(ex: WorkoutExercise, set: ExerciseSet): void {
    const workoutId = this.workout()?.id;
    if (!workoutId || !this.canEdit()) {
      return;
    }
    this.api.deleteExerciseSet(workoutId, ex.id, set.id).subscribe({
      next: () => {
        this.loadSets(workoutId, ex.id);
        this.loadExercises(workoutId);
      },
      error: () => this.toast.error('Could not remove set')
    });
  }

  startSession(): void {
    const workout = this.workout();
    if (!workout) {
      return;
    }
    if (this.session.hasSession() && !this.session.isActiveFor(workout.id)) {
      this.toast.error('End the current live session first');
      return;
    }
    if (this.session.isActiveFor(workout.id)) {
      this.resumeLocalAndRemote(workout.id);
      return;
    }
    if (workout.status === 'COMPLETED') {
      this.toast.error('Completed workouts cannot be resumed — edit within 5 days if needed');
      return;
    }
    if (workout.status === 'PAUSED') {
      if (!canResumePausedWorkout(workout)) {
        this.api
          .completeWorkout(workout.id, {
            durationMinutes: workout.durationMinutes ?? 1,
            elapsedMs: workout.elapsedMs ?? 0
          })
          .subscribe({
            next: (updated) => {
              this.workout.set(updated);
              this.toast.error('Pause exceeded 1 hour — workout marked completed');
            }
          });
        return;
      }
      this.api.resumeWorkout(workout.id).subscribe({
        next: (updated) => {
          this.workout.set(updated);
          this.session.start(workout.id, workout.name, workout.elapsedMs ?? 0);
          this.session.show();
        },
        error: () => this.toast.error('Could not resume session')
      });
      return;
    }
    // IN_PROGRESS without local timer — attach
    this.session.start(workout.id, workout.name, workout.elapsedMs ?? 0);
  }

  private maybeAttachSession(workout: Workout): void {
    if (this.session.hasSession()) {
      return;
    }
    if (workout.status === 'IN_PROGRESS') {
      this.session.attachFromServer(workout);
      return;
    }
    if (workout.status === 'PAUSED' && canResumePausedWorkout(workout)) {
      this.session.attachFromServer(workout);
    }
  }

  private resumeLocalAndRemote(workoutId: string): void {
    if (!this.session.canResume()) {
      const minutes = this.session.minutesRounded() || 1;
      const elapsedMs = this.session.elapsedMs();
      this.session.clearLocal();
      this.api.completeWorkout(workoutId, { durationMinutes: minutes, elapsedMs }).subscribe({
        next: (updated) => {
          this.workout.set(updated);
          this.toast.error('Pause exceeded 1 hour — workout marked completed');
        }
      });
      return;
    }
    this.api.resumeWorkout(workoutId).subscribe({
      next: (updated) => {
        this.workout.set(updated);
        this.session.resume();
        this.session.show();
      },
      error: () => this.toast.error('Could not resume session')
    });
  }

  endSession(): void {
    const workout = this.workout();
    if (!workout || !this.session.isActiveFor(workout.id)) {
      return;
    }
    void this.confirmEndSession(workout);
  }

  private async confirmEndSession(workout: Workout): Promise<void> {
    const ok = await this.confirmDlg.ask({
      title: 'End session?',
      message: `End “${workout.name}”? It will be marked completed. Active time and estimated calories will be saved (pauses and rest excluded).`,
      meta: `Time: ${this.session.display()}`,
      confirmLabel: 'Yes, end session',
      danger: true
    });
    if (!ok) {
      return;
    }
    const result = this.session.end();
    if (!result) {
      return;
    }
    const minutes = result.minutes || workout.durationMinutes || 1;
    this.calories.estimateForWorkout(workout.id, minutes).subscribe({
      next: (burn) => {
        this.api
          .completeWorkout(workout.id, {
            durationMinutes: minutes,
            caloriesBurned: burn.calories,
            elapsedMs: result.elapsedMs
          })
          .subscribe({
            next: (updated) => {
              this.workout.set(updated);
              this.toast.success(
                `Session completed · ${minutes} min · ~${burn.calories} kcal (${burn.mode})`
              );
            },
            error: () => this.toast.success('Session completed')
          });
      },
      error: () => {
        this.api
          .completeWorkout(workout.id, {
            durationMinutes: minutes,
            caloriesBurned: workout.caloriesBurned,
            elapsedMs: result.elapsedMs
          })
          .subscribe({
            next: (updated) => {
              this.workout.set(updated);
              this.toast.success(`Session completed · ${minutes} min saved`);
            },
            error: () => this.toast.success('Session completed')
          });
      }
    });
  }

  openAddModal(): void {
    if (!this.canEdit()) {
      this.toast.error('This workout can no longer be edited');
      return;
    }
    this.editingExerciseId.set(null);
    this.resetExerciseForm();
    this.modalOpen.set(true);
  }

  openEditModal(row: WorkoutExercise): void {
    if (!this.canEdit()) {
      this.toast.error('This workout can no longer be edited');
      return;
    }
    this.editingExerciseId.set(row.id);
    this.exerciseForm.setValue({
      name: row.name,
      notes: row.notes ?? ''
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingExerciseId.set(null);
    this.resetExerciseForm();
  }

  submitExercise(): void {
    const workoutId = this.workout()?.id;
    if (!workoutId || this.exerciseForm.invalid) {
      this.exerciseForm.markAllAsTouched();
      return;
    }

    const raw = this.exerciseForm.getRawValue();
    const exerciseId = this.editingExerciseId();
    const existing = exerciseId
      ? this.exercises().find((ex) => ex.id === exerciseId)
      : null;

    const body = {
      name: raw.name.trim(),
      sets: existing?.sets ?? null,
      reps: existing?.reps ?? null,
      weightKg: existing?.weightKg ?? null,
      oneRmKg: existing?.oneRmKg ?? null,
      maxWeightKg: existing?.maxWeightKg ?? null,
      maxReps: existing?.maxReps ?? null,
      notes: raw.notes.trim() || null
    };

    this.saving.set(true);
    const updating = !!exerciseId;
    const req$ = updating
      ? this.api.updateExercise(workoutId, exerciseId, body)
      : this.api.createExercise(workoutId, body);

    req$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.closeModal();
        this.loadExercises(workoutId);
        if (!updating) {
          this.expandedExerciseId.set(saved.id);
        }
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not save exercise.');
        this.toast.error('Could not save exercise');
      }
    });
  }

  async removeExercise(ex: WorkoutExercise): Promise<void> {
    const workoutId = this.workout()?.id;
    if (!workoutId) {
      return;
    }
    if (!this.canEdit()) {
      this.toast.error('Older than 5 days — archive instead of delete');
      return;
    }
    const startKey = workoutStartIso(this.workout()!).slice(0, 10);
    const remaining = remainingEditDays(startKey);
    const ok = await this.confirmDlg.ask({
      title: 'Confirm delete',
      message: `Delete “${ex.name}”? You have ${remaining} day(s) left in the edit window.`,
      confirmLabel: 'Yes, delete',
      danger: true
    });
    if (!ok) {
      return;
    }
    this.api.deleteExercise(workoutId, ex.id).subscribe({
      next: () => {
        this.loadExercises(workoutId);
        this.toast.success('Exercise deleted');
      },
      error: () => {
        this.error.set('Could not delete exercise.');
        this.toast.error('Could not delete exercise');
      }
    });
  }

  async archiveExercise(ex: WorkoutExercise): Promise<void> {
    const workoutId = this.workout()?.id;
    if (!workoutId) {
      return;
    }
    const ok = await this.confirmDlg.ask({
      title: 'Confirm archive',
      message: `Archive “${ex.name}”? It will move to Profile → Archived.`,
      confirmLabel: 'Yes, archive'
    });
    if (!ok) {
      return;
    }
    this.api.archiveExercise(workoutId, ex.id).subscribe({
      next: () => {
        this.loadExercises(workoutId);
        this.toast.success('Exercise archived');
      },
      error: () => this.toast.error('Could not archive exercise')
    });
  }

  canDeleteExercise(_ex: WorkoutExercise): boolean {
    return this.canEdit();
  }

  private resetExerciseForm(): void {
    this.exerciseForm.reset({
      name: '',
      notes: ''
    });
  }
}
