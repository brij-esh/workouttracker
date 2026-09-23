import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { AndroidBackButtonService } from '../../core/android-back-button.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import {
  ExerciseDifficulty,
  EquipmentType,
  LibraryExercise,
  MuscleGroup
} from '../../core/models';
import { AppSelectOption, SelectComponent } from '../../shared/select.component';

@Component({
  selector: 'app-exercise-library',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SelectComponent],
  templateUrl: './exercise-library.component.html',
  styleUrl: './exercise-library.component.scss'
})
export class ExerciseLibraryComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly androidBack = inject(AndroidBackButtonService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pageSize = 24;
  readonly rows = signal<LibraryExercise[]>([]);
  readonly page = signal(0);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly hasNext = signal(false);
  readonly hasPrevious = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly muscleGroups = signal<string[]>([]);
  readonly equipmentOptions = signal<string[]>([]);
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);

  readonly customOnPage = computed(() => this.rows().filter((r) => r.custom).length);

  readonly filters = this.fb.nonNullable.group({
    q: [''],
    muscleGroup: [''],
    equipment: ['']
  });

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    muscleGroup: ['CHEST' as MuscleGroup, Validators.required],
    equipment: ['' as '' | EquipmentType],
    difficulty: ['' as '' | ExerciseDifficulty],
    instructions: ['']
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
    this.api.getExerciseLibraryMeta().subscribe({
      next: (meta) => {
        this.muscleGroups.set(meta.muscleGroups);
        this.equipmentOptions.set(meta.equipment);
      }
    });
    this.loadPage(0);
  }

  applyFilters(): void {
    this.loadPage(0);
  }

  clearFilters(): void {
    this.filters.reset({ q: '', muscleGroup: '', equipment: '' });
    this.loadPage(0);
  }

  loadPage(page: number): void {
    const f = this.filters.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listLibraryExercises({
        page,
        size: this.pageSize,
        q: f.q || undefined,
        muscleGroup: f.muscleGroup || undefined,
        equipment: f.equipment || undefined
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.content);
          this.page.set(res.page);
          this.totalElements.set(res.totalElements);
          this.totalPages.set(res.totalPages);
          this.hasNext.set(res.hasNext);
          this.hasPrevious.set(res.hasPrevious);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Failed to load exercise library');
        }
      });
  }

  prevPage(): void {
    if (this.hasPrevious() && !this.loading()) {
      this.loadPage(this.page() - 1);
    }
  }

  nextPage(): void {
    if (this.hasNext() && !this.loading()) {
      this.loadPage(this.page() + 1);
    }
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      name: '',
      muscleGroup: 'CHEST',
      equipment: '',
      difficulty: '',
      instructions: ''
    });
    this.modalOpen.set(true);
  }

  openEdit(row: LibraryExercise, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!row.custom) {
      this.toast.error('System exercises can’t be edited');
      return;
    }
    this.editingId.set(row.id);
    this.form.setValue({
      name: row.name,
      muscleGroup: row.muscleGroup,
      equipment: row.equipment ?? '',
      difficulty: row.difficulty ?? '',
      instructions: row.instructions ?? ''
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingId.set(null);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const body = {
      name: raw.name.trim(),
      muscleGroup: raw.muscleGroup,
      equipment: raw.equipment || null,
      difficulty: raw.difficulty || null,
      instructions: raw.instructions.trim() || null
    };
    this.saving.set(true);
    const id = this.editingId();
    const req$ = id
      ? this.api.updateLibraryExercise(id, body)
      : this.api.createLibraryExercise(body);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        if (!id) {
          this.toast.success('Custom exercise added');
        }
        this.loadPage(this.page());
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Could not save exercise');
      }
    });
  }

  async remove(row: LibraryExercise, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!row.custom) {
      this.toast.error('System exercises can’t be deleted');
      return;
    }
    const ok = await this.confirm.ask({
      title: 'Delete custom exercise?',
      message: `Remove “${row.name}” from your library?`,
      confirmLabel: 'Yes, delete',
      danger: true
    });
    if (!ok) {
      return;
    }
    this.api.deleteLibraryExercise(row.id).subscribe({
      next: () => {
        this.toast.success('Exercise removed');
        this.loadPage(this.page());
      },
      error: () => this.toast.error('Could not delete exercise')
    });
  }

  filterMuscleOptions(): AppSelectOption[] {
    return [
      { value: '', label: 'All' },
      ...this.muscleGroups().map((g) => ({ value: g, label: this.label(g) }))
    ];
  }

  filterEquipmentOptions(): AppSelectOption[] {
    return [
      { value: '', label: 'All' },
      ...this.equipmentOptions().map((e) => ({ value: e, label: this.label(e) }))
    ];
  }

  formMuscleOptions(): AppSelectOption[] {
    return this.muscleGroups().map((g) => ({ value: g, label: this.label(g) }));
  }

  formEquipmentOptions(): AppSelectOption[] {
    return [
      { value: '', label: 'None' },
      ...this.equipmentOptions().map((e) => ({ value: e, label: this.label(e) }))
    ];
  }

  difficultyOptions(): AppSelectOption[] {
    return [
      { value: '', label: 'Unspecified' },
      { value: 'BEGINNER', label: 'Beginner' },
      { value: 'INTERMEDIATE', label: 'Intermediate' },
      { value: 'ADVANCED', label: 'Advanced' }
    ];
  }

  label(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  }
}
