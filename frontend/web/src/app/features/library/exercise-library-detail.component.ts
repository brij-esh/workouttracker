import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { LibraryExercise } from '../../core/models';
import { MuscleMapComponent } from '../../shared/muscle-map.component';
import { ExerciseMotionComponent } from '../../shared/exercise-motion.component';

@Component({
  selector: 'app-exercise-library-detail',
  standalone: true,
  imports: [RouterLink, MuscleMapComponent, ExerciseMotionComponent],
  templateUrl: './exercise-library-detail.component.html',
  styleUrl: './exercise-library-detail.component.scss'
})
export class ExerciseLibraryDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly exercise = signal<LibraryExercise | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly instructionSteps = computed(() => this.steps(this.exercise()?.instructions ?? null));

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigateByUrl('/app/library');
      return;
    }
    this.api.getLibraryExercise(id).subscribe({
      next: (ex) => {
        this.exercise.set(ex);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Exercise not found');
      }
    });
  }

  label(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  }

  private steps(instructions: string | null): string[] {
    if (!instructions?.trim()) {
      return [];
    }
    return instructions
      .split(/\n+/)
      .map((line) => line.trim().replace(/^\d+\.\s*/, ''))
      .filter(Boolean);
  }
}
