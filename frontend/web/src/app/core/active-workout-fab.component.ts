import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ActiveWorkoutSessionService } from './active-workout-session.service';
import { ApiService } from './api.service';
import { ConfirmDialogService } from './confirm-dialog.service';
import { ToastService } from './toast.service';
import { WorkoutCalorieService } from './workout-calorie.service';
import { APP_BRAND } from './app-brand';

@Component({
  selector: 'app-active-workout-fab',
  standalone: true,
  templateUrl: './active-workout-fab.component.html',
  styleUrl: './active-workout-fab.component.scss'
})
export class ActiveWorkoutFabComponent {
  readonly session = inject(ActiveWorkoutSessionService);
  readonly brand = APP_BRAND;
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly calories = inject(WorkoutCalorieService);

  onCardClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button')) {
      return;
    }
    this.session.toggleVisibility();
  }

  onCardKey(): void {
    this.session.toggleVisibility();
  }

  openWorkout(event?: Event): void {
    event?.stopPropagation();
    const active = this.session.active();
    if (!active) {
      return;
    }
    this.session.show();
    void this.router.navigate(['/app/workouts', active.workoutId]);
  }

  toggleRun(event?: Event): void {
    event?.stopPropagation();
    const active = this.session.active();
    if (!active) {
      return;
    }
    if (active.running) {
      const elapsedMs = this.session.elapsedMs();
      this.session.pause();
      this.api.pauseWorkout(active.workoutId, elapsedMs).subscribe({
        error: () => this.toast.error('Could not pause session on server')
      });
      return;
    }
    if (!this.session.canResume()) {
      this.autoCompleteExpired(active.workoutId, active.title);
      return;
    }
    this.api.resumeWorkout(active.workoutId).subscribe({
      next: () => {
        if (!this.session.resume()) {
          this.autoCompleteExpired(active.workoutId, active.title);
        }
      },
      error: () => {
        this.toast.error('Resume window expired — workout marked completed');
        this.session.clearLocal();
      }
    });
  }

  async endSession(event?: Event): Promise<void> {
    event?.stopPropagation();
    const active = this.session.active();
    if (!active) {
      return;
    }
    const ok = await this.confirm.ask({
      title: 'End session?',
      message: `End “${active.title}”? It will be marked completed. Active time and estimated calories will be saved (pauses and rest excluded).`,
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
    this.finishComplete(result.workoutId, result.minutes, result.elapsedMs);
  }

  private autoCompleteExpired(workoutId: string, title: string): void {
    const minutes = this.session.minutesRounded() || 1;
    const elapsedMs = this.session.elapsedMs();
    this.session.clearLocal();
    this.api
      .completeWorkout(workoutId, { durationMinutes: minutes, elapsedMs })
      .subscribe({
        next: () =>
          this.toast.error(`“${title}” pause exceeded 1 hour — marked completed`),
        error: () => this.toast.error('Session expired and could not be completed')
      });
  }

  private finishComplete(workoutId: string, minutes: number, elapsedMs: number): void {
    this.calories.estimateForWorkout(workoutId, minutes).subscribe({
      next: (burn) => {
        this.api
          .completeWorkout(workoutId, {
            durationMinutes: minutes,
            caloriesBurned: burn.calories,
            elapsedMs
          })
          .subscribe({
            next: () =>
              this.toast.success(
                `Session completed · ${minutes} min · ~${burn.calories} kcal (${burn.mode})`
              ),
            error: () => this.toast.success('Session completed')
          });
      },
      error: () => {
        this.api
          .completeWorkout(workoutId, { durationMinutes: minutes, elapsedMs })
          .subscribe({
            next: () => this.toast.success(`Session completed · ${minutes} min saved`),
            error: () => this.toast.success('Session completed')
          });
      }
    });
  }
}
