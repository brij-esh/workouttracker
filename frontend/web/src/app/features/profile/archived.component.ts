import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { PersonalRecord, WeightLog, Workout, WorkoutExercise } from '../../core/models';

type ArchivedTab = 'workouts' | 'exercises' | 'weights' | 'records';

@Component({
  selector: 'app-archived',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './archived.component.html',
  styleUrl: './archived.component.scss'
})
export class ArchivedComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly tab = signal<ArchivedTab>('workouts');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly workouts = signal<Workout[] | null>(null);
  readonly exercises = signal<WorkoutExercise[] | null>(null);
  readonly weights = signal<WeightLog[] | null>(null);
  readonly records = signal<PersonalRecord[] | null>(null);

  ngOnInit(): void {
    this.ensureLoaded('workouts');
  }

  setTab(next: ArchivedTab): void {
    if (this.tab() === next) {
      return;
    }
    this.tab.set(next);
    this.error.set(null);
    this.ensureLoaded(next);
  }

  private ensureLoaded(tab: ArchivedTab): void {
    switch (tab) {
      case 'workouts':
        if (this.workouts() !== null) {
          return;
        }
        this.fetchWorkouts();
        break;
      case 'exercises':
        if (this.exercises() !== null) {
          return;
        }
        this.fetchExercises();
        break;
      case 'weights':
        if (this.weights() !== null) {
          return;
        }
        this.fetchWeights();
        break;
      case 'records':
        if (this.records() !== null) {
          return;
        }
        this.fetchRecords();
        break;
    }
  }

  private fetchWorkouts(): void {
    this.loading.set(true);
    this.api.listArchivedWorkouts().subscribe({
      next: (rows) => {
        this.workouts.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.workouts.set([]);
        this.loading.set(false);
        this.error.set('Could not load archived workouts');
      }
    });
  }

  private fetchExercises(): void {
    this.loading.set(true);
    this.api.listArchivedExercises().subscribe({
      next: (rows) => {
        this.exercises.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.exercises.set([]);
        this.loading.set(false);
        this.error.set('Could not load archived exercises');
      }
    });
  }

  private fetchWeights(): void {
    this.loading.set(true);
    this.api.listArchivedWeightLogs().subscribe({
      next: (rows) => {
        this.weights.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.weights.set([]);
        this.loading.set(false);
        this.error.set('Could not load archived weight logs');
      }
    });
  }

  private fetchRecords(): void {
    this.loading.set(true);
    this.api.listArchivedPersonalRecords().subscribe({
      next: (rows) => {
        this.records.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.records.set([]);
        this.loading.set(false);
        this.error.set('Could not load archived personal records');
      }
    });
  }
}
