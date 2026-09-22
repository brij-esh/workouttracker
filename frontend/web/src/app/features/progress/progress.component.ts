import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { NutritionTargetsSyncService } from '../../core/nutrition-targets-sync.service';
import {
  BodyWeightProgress,
  PersonalRecord,
  PersonalRecordRequest,
  StrengthExerciseDetail,
  StrengthExerciseSummary,
  WeightLog,
  WeightLogRequest
} from '../../core/models';
import { AppSelectOption, SelectComponent } from '../../shared/select.component';
import { DateInputComponent } from '../../shared/date-input.component';
import { ConsistencyProgressComponent } from './consistency-progress.component';
import { NutritionInsightsPanelComponent } from '../nutrition/nutrition-insights-panel.component';

type ProgressTab = 'strength' | 'body' | 'consistency' | 'insights';
type ProgressView = 'numeric' | 'graph';

interface WeightPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  weightKg: number;
  recordedOn: string;
}

interface OneRmPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  oneRmKg: number;
  date: string;
  maxWeightKg: number | null;
}

interface PrBar {
  key: string;
  exerciseName: string;
  recordType: string;
  value: number;
  pct: number;
  unit: string;
}

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    SelectComponent,
    DateInputComponent,
    ConsistencyProgressComponent,
    NutritionInsightsPanelComponent
  ],
  templateUrl: './progress.component.html',
  styleUrl: './progress.component.scss'
})
export class ProgressComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirmDlg = inject(ConfirmDialogService);
  private readonly nutritionSync = inject(NutritionTargetsSyncService);

  /** Entries older than this many days cannot be created or edited. */
  readonly editWindowDays = 5;

  readonly mainTab = signal<ProgressTab>('strength');
  readonly viewMode = signal<ProgressView>('numeric');
  readonly weights = signal<WeightLog[]>([]);
  readonly bodyOverview = signal<BodyWeightProgress | null>(null);
  readonly records = signal<PersonalRecord[]>([]);
  readonly strengthExercises = signal<StrengthExerciseSummary[]>([]);
  readonly selectedExerciseKey = signal<string | null>(null);
  readonly strengthDetail = signal<StrengthExerciseDetail | null>(null);
  readonly strengthLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly editingWeightId = signal<string | null>(null);
  readonly editingPrId = signal<string | null>(null);
  readonly saving = signal(false);

  readonly todayKey = this.localDateKey();
  readonly minDateKey = this.shiftDateKey(this.todayKey, -this.editWindowDays);

  readonly chartPad = { top: 18, right: 16, bottom: 36, left: 44 };
  readonly chartW = 560;
  readonly chartH = 240;

  readonly weightSorted = computed(() =>
    [...this.weights()].sort((a, b) => a.recordedOn.localeCompare(b.recordedOn))
  );

  readonly weightStats = computed(() => {
    const overview = this.bodyOverview();
    if (overview?.currentWeightKg != null) {
      return {
        latest: overview.dailyWeightKg ?? overview.currentWeightKg,
        first: overview.startingWeightKg ?? overview.currentWeightKg,
        min: overview.monthlyAverageKg ?? overview.currentWeightKg,
        max: overview.weeklyAverageKg ?? overview.currentWeightKg,
        delta: overview.weightChangeKg ?? 0,
        count: this.weights().length
      };
    }
    const rows = this.weightSorted();
    if (!rows.length) {
      return null;
    }
    const first = rows[0];
    const latest = rows[rows.length - 1];
    const values = rows.map((r) => Number(r.weightKg));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const delta = Number(latest.weightKg) - Number(first.weightKg);
    return {
      latest: Number(latest.weightKg),
      first: Number(first.weightKg),
      min,
      max,
      delta,
      count: rows.length
    };
  });

  /** 7-day rolling average series for the graph (smoothed trend). */
  readonly rollingAvgPoints = computed((): WeightPoint[] => {
    const rows = this.weightSorted();
    if (!rows.length) {
      return [];
    }

    const smoothed = rows.map((row, idx) => {
      const end = this.parseDateOnly(row.recordedOn);
      const windowStart = end ? new Date(end) : null;
      if (windowStart) {
        windowStart.setDate(windowStart.getDate() - 6);
      }
      const startKey = windowStart ? this.localDateKey(windowStart) : row.recordedOn;
      const slice = rows
        .slice(0, idx + 1)
        .filter((r) => r.recordedOn >= startKey && r.recordedOn <= row.recordedOn);
      const avg = slice.reduce((sum, r) => sum + Number(r.weightKg), 0) / slice.length;
      return { ...row, weightKg: avg };
    });

    const values = smoothed.map((r) => Number(r.weightKg));
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const pad = (max - min) * 0.12;
    min -= pad;
    max += pad;

    const { top, right, bottom, left } = this.chartPad;
    const innerW = this.chartW - left - right;
    const innerH = this.chartH - top - bottom;
    const n = smoothed.length;

    return smoothed.map((row, i) => {
      const x = left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const y = top + ((max - Number(row.weightKg)) / (max - min)) * innerH;
      return {
        id: `avg-${row.id}`,
        x,
        y,
        label: this.chartAxisLabel(this.shortDate(row.recordedOn), i, n),
        weightKg: Number(row.weightKg),
        recordedOn: row.recordedOn
      };
    });
  });

  readonly rollingAvgLine = computed(() => this.linePath(this.rollingAvgPoints()));
  readonly rollingAvgArea = computed(() => this.areaPath(this.rollingAvgPoints()));
  readonly rollingAvgYTicks = computed(() => {
    const pts = this.rollingAvgPoints();
    if (!pts.length) {
      return [];
    }
    const values = pts.map((p) => p.weightKg);
    return this.yTicks(Math.min(...values), Math.max(...values));
  });

  /** Daily weigh-ins plotted on the same axis as the 7-day average trend. */
  readonly dailyDotsOnAvgAxis = computed((): WeightPoint[] => {
    const rows = this.weightSorted();
    const avgPts = this.rollingAvgPoints();
    if (!rows.length || !avgPts.length) {
      return [];
    }
    const avgValues = avgPts.map((p) => p.weightKg);
    let min = Math.min(...avgValues);
    let max = Math.max(...avgValues);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const pad = (max - min) * 0.12;
    min -= pad;
    max += pad;

    const { top, right, bottom, left } = this.chartPad;
    const innerW = this.chartW - left - right;
    const innerH = this.chartH - top - bottom;
    const n = rows.length;

    return rows.map((row, i) => {
      const x = left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const y = top + ((max - Number(row.weightKg)) / (max - min)) * innerH;
      return {
        id: row.id,
        x,
        y,
        label: this.shortDate(row.recordedOn),
        weightKg: Number(row.weightKg),
        recordedOn: row.recordedOn
      };
    });
  });

  readonly weightPoints = computed((): WeightPoint[] => {
    const rows = this.weightSorted();
    if (!rows.length) {
      return [];
    }

    const values = rows.map((r) => Number(r.weightKg));
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const pad = (max - min) * 0.12;
    min -= pad;
    max += pad;

    const { top, right, bottom, left } = this.chartPad;
    const innerW = this.chartW - left - right;
    const innerH = this.chartH - top - bottom;
    const n = rows.length;

    return rows.map((row, i) => {
      const x = left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const y = top + ((max - Number(row.weightKg)) / (max - min)) * innerH;
      return {
        id: row.id,
        x,
        y,
        label: this.shortDate(row.recordedOn),
        weightKg: Number(row.weightKg),
        recordedOn: row.recordedOn
      };
    });
  });

  readonly weightLine = computed(() => this.linePath(this.weightPoints()));
  readonly weightArea = computed(() => this.areaPath(this.weightPoints()));
  readonly weightYTicks = computed(() => {
    const stats = this.weightStats();
    if (!stats) {
      return [];
    }
    return this.yTicks(stats.min, stats.max);
  });

  readonly oneRmHistoryRows = computed(() => {
    const detail = this.strengthDetail();
    if (!detail) {
      return [];
    }
    return detail.oneRmHistory
      .filter((p) => p.estimatedOneRmKg != null)
      .sort((a, b) => a.date.localeCompare(b.date));
  });

  readonly oneRmPoints = computed((): OneRmPoint[] => {
    const rows = this.oneRmHistoryRows();
    if (!rows.length) {
      return [];
    }

    const values = rows.map((r) => Number(r.estimatedOneRmKg));
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const pad = (max - min) * 0.12;
    min -= pad;
    max += pad;

    const { top, right, bottom, left } = this.chartPad;
    const innerW = this.chartW - left - right;
    const innerH = this.chartH - top - bottom;
    const n = rows.length;

    return rows.map((row, i) => {
      const oneRm = Number(row.estimatedOneRmKg);
      const x = left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const y = top + ((max - oneRm) / (max - min)) * innerH;
      return {
        id: `${row.workoutId}-${row.date}`,
        x,
        y,
        label: this.chartAxisLabel(this.shortDate(row.date), i, n),
        oneRmKg: oneRm,
        date: row.date,
        maxWeightKg: row.maxWeightKg
      };
    });
  });

  readonly oneRmLine = computed(() => this.linePath(this.oneRmPoints()));
  readonly oneRmArea = computed(() => this.areaPath(this.oneRmPoints()));
  readonly oneRmYTicks = computed(() => {
    const rows = this.oneRmHistoryRows();
    if (!rows.length) {
      return [];
    }
    const values = rows.map((r) => Number(r.estimatedOneRmKg));
    return this.yTicks(Math.min(...values), Math.max(...values));
  });

  readonly prBars = computed((): PrBar[] => {
    const best = new Map<string, PersonalRecord>();
    for (const row of this.records()) {
      const key = `${row.exerciseName.toLowerCase()}|${row.recordType}`;
      const existing = best.get(key);
      if (!existing || Number(row.value) > Number(existing.value)) {
        best.set(key, row);
      }
    }
    const rows = [...best.values()].sort((a, b) => Number(b.value) - Number(a.value));
    const peak = Math.max(...rows.map((r) => Number(r.value)), 1);
    return rows.map((r) => ({
      key: `${r.exerciseName}-${r.recordType}`,
      exerciseName: r.exerciseName,
      recordType: r.recordType,
      value: Number(r.value),
      pct: Math.max(6, (Number(r.value) / peak) * 100),
      unit: this.prUnit(r.recordType)
    }));
  });

  readonly weightForm = this.fb.nonNullable.group({
    recordedOn: [this.todayKey, Validators.required],
    weightKg: [70, Validators.required],
    notes: ['']
  });

  readonly goalForm = this.fb.nonNullable.group({
    goalWeightKg: [75, [Validators.required, Validators.min(20)]]
  });

  readonly prForm = this.fb.nonNullable.group({
    exerciseName: ['', Validators.required],
    recordType: ['WEIGHT_KG', Validators.required],
    value: [100, Validators.required],
    recordedOn: [this.todayKey, Validators.required],
    notes: ['']
  });

  ngOnInit(): void {
    this.reload();
  }

  setMainTab(tab: ProgressTab): void {
    this.mainTab.set(tab);
    this.error.set(null);
    if (tab === 'body' && !this.weights().length && !this.records().length) {
      this.reloadBody();
    }
  }

  setView(mode: ProgressView): void {
    this.viewMode.set(mode);
  }

  reload(): void {
    this.reloadStrength();
    this.reloadBody();
  }

  selectExercise(row: StrengthExerciseSummary): void {
    if (this.selectedExerciseKey() === row.exerciseKey && this.strengthDetail()) {
      return;
    }
    this.selectedExerciseKey.set(row.exerciseKey);
    this.strengthLoading.set(true);
    this.api.getStrengthProgress(row.exerciseKey).subscribe({
      next: (detail) => {
        this.strengthDetail.set(detail);
        this.strengthLoading.set(false);
      },
      error: () => {
        this.strengthLoading.set(false);
        this.toast.error('Could not load exercise strength history');
      }
    });
  }

  clearExercise(): void {
    this.selectedExerciseKey.set(null);
    this.strengthDetail.set(null);
  }

  formatProgress(pct: number | null | undefined): string {
    if (pct == null) {
      return '—';
    }
    const sign = pct > 0 ? '+' : '';
    return `${sign}${Number(pct).toFixed(1)}%`;
  }

  formatWeightChain(values: number[] | null | undefined): string {
    if (!values?.length) {
      return '—';
    }
    return values.map((v) => this.trimNum(v)).join(' → ') + ' kg';
  }

  formatRepsChain(values: number[] | null | undefined): string {
    if (!values?.length) {
      return '—';
    }
    return values.map((v) => String(Math.round(v))).join(' → ');
  }

  formatVolumeChain(values: number[] | null | undefined): string {
    if (!values?.length) {
      return '—';
    }
    return values.map((v) => this.trimNum(v, 0)).join(' → ') + ' kg';
  }

  formatRate(rate: number | null | undefined): string {
    if (rate == null) {
      return '—';
    }
    const sign = rate > 0 ? '+' : '';
    return `${sign}${Number(rate).toFixed(2)} kg/wk`;
  }

  async requestSaveGoal(): Promise<void> {
    if (this.goalForm.invalid) {
      this.goalForm.markAllAsTouched();
      this.toast.error('Enter a valid goal weight');
      return;
    }
    const goalWeightKg = this.goalForm.controls.goalWeightKg.value;
    this.saving.set(true);
    this.api.upsertWeightGoal({ goalWeightKg }).subscribe({
      next: (overview) => {
        this.saving.set(false);
        this.bodyOverview.set(overview);
        this.toast.success('Goal weight saved');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Could not save goal weight');
      }
    });
  }

  isEditable(recordedOn: string): boolean {
    return this.dateGate(recordedOn) === null;
  }

  remainingDays(recordedOn: string): number {
    const age = this.ageInDays(recordedOn);
    if (age < 0) {
      return -1;
    }
    return Math.max(0, this.editWindowDays - age);
  }

  async requestSaveWeight(): Promise<void> {
    if (this.weightForm.invalid) {
      this.weightForm.markAllAsTouched();
      this.toast.error('Fill date and weight');
      return;
    }
    const recordedOn = this.weightForm.controls.recordedOn.value;
    const gate = this.dateGate(recordedOn);
    if (gate) {
      this.toast.error(gate);
      return;
    }
    const remaining = this.remainingDays(recordedOn);
    const isUpdate = !!this.editingWeightId();
    const ok = await this.confirmDlg.ask({
      title: isUpdate ? 'Confirm update' : 'Confirm save',
      message: this.confirmMessage(isUpdate ? 'update this weight log' : 'save this weight log', remaining),
      meta: `Date: ${recordedOn} · ${remaining} day(s) left to edit`,
      confirmLabel: isUpdate ? 'Yes, update' : 'Yes, save'
    });
    if (!ok) {
      return;
    }
    this.commitWeight();
  }

  async requestSavePr(): Promise<void> {
    if (this.prForm.invalid) {
      this.prForm.markAllAsTouched();
      this.toast.error('Fill exercise, value, and date');
      return;
    }
    const recordedOn = this.prForm.controls.recordedOn.value;
    const gate = this.dateGate(recordedOn);
    if (gate) {
      this.toast.error(gate);
      return;
    }
    const remaining = this.remainingDays(recordedOn);
    const isUpdate = !!this.editingPrId();
    const ok = await this.confirmDlg.ask({
      title: isUpdate ? 'Confirm update' : 'Confirm save',
      message: this.confirmMessage(isUpdate ? 'update this personal record' : 'save this personal record', remaining),
      meta: `Date: ${recordedOn} · ${remaining} day(s) left to edit`,
      confirmLabel: isUpdate ? 'Yes, update' : 'Yes, save'
    });
    if (!ok) {
      return;
    }
    this.commitPr();
  }

  async requestDeleteWeight(row: WeightLog): Promise<void> {
    if (!this.isEditable(row.recordedOn)) {
      this.toast.error('Older than 5 days — archive instead of delete');
      return;
    }
    const remaining = this.remainingDays(row.recordedOn);
    const ok = await this.confirmDlg.ask({
      title: 'Confirm delete',
      message: this.confirmMessage('delete this weight log', remaining),
      meta: `Date: ${row.recordedOn}`,
      confirmLabel: 'Yes, delete',
      danger: true
    });
    if (!ok) {
      return;
    }
    this.saving.set(true);
    this.api.deleteWeightLog(row.id).subscribe({
      next: () => {
        this.saving.set(false);
        if (this.editingWeightId() === row.id) {
          this.cancelEditWeight();
        }
        this.reloadBody();
        this.toast.success('Weight log deleted');
        this.nutritionSync.syncAfterWeightLogChange().subscribe();
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Could not delete weight log');
      }
    });
  }

  async requestArchiveWeight(row: WeightLog): Promise<void> {
    const ok = await this.confirmDlg.ask({
      title: 'Confirm archive',
      message: 'Archive this weight log? It will move to Profile → Archived.',
      meta: `Date: ${row.recordedOn}`,
      confirmLabel: 'Yes, archive'
    });
    if (!ok) {
      return;
    }
    this.saving.set(true);
    this.api.archiveWeightLog(row.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.reloadBody();
        this.toast.success('Weight log archived');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Could not archive weight log');
      }
    });
  }

  async requestDeletePr(row: PersonalRecord): Promise<void> {
    if (!this.isEditable(row.recordedOn)) {
      this.toast.error('Older than 5 days — archive instead of delete');
      return;
    }
    const remaining = this.remainingDays(row.recordedOn);
    const ok = await this.confirmDlg.ask({
      title: 'Confirm delete',
      message: this.confirmMessage('delete this personal record', remaining),
      meta: `Date: ${row.recordedOn}`,
      confirmLabel: 'Yes, delete',
      danger: true
    });
    if (!ok) {
      return;
    }
    this.saving.set(true);
    this.api.deletePersonalRecord(row.id).subscribe({
      next: () => {
        this.saving.set(false);
        if (this.editingPrId() === row.id) {
          this.cancelEditPr();
        }
        this.reloadBody();
        this.toast.success('Personal record deleted');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Could not delete personal record');
      }
    });
  }

  async requestArchivePr(row: PersonalRecord): Promise<void> {
    const ok = await this.confirmDlg.ask({
      title: 'Confirm archive',
      message: 'Archive this personal record? It will move to Profile → Archived.',
      meta: `Date: ${row.recordedOn}`,
      confirmLabel: 'Yes, archive'
    });
    if (!ok) {
      return;
    }
    this.saving.set(true);
    this.api.archivePersonalRecord(row.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.reloadBody();
        this.toast.success('Personal record archived');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Could not archive personal record');
      }
    });
  }

  editWeight(row: WeightLog): void {
    if (!this.isEditable(row.recordedOn)) {
      this.toast.error('This weight log is older than 5 days and cannot be edited');
      return;
    }
    this.editingWeightId.set(row.id);
    this.weightForm.setValue({
      recordedOn: row.recordedOn,
      weightKg: Number(row.weightKg),
      notes: row.notes ?? ''
    });
    this.viewMode.set('numeric');
  }

  cancelEditWeight(): void {
    this.editingWeightId.set(null);
    this.weightForm.reset({
      recordedOn: this.todayKey,
      weightKg: 70,
      notes: ''
    });
  }

  editPr(row: PersonalRecord): void {
    if (!this.isEditable(row.recordedOn)) {
      this.toast.error('This personal record is older than 5 days and cannot be edited');
      return;
    }
    this.editingPrId.set(row.id);
    this.prForm.setValue({
      exerciseName: row.exerciseName,
      recordType: row.recordType,
      value: Number(row.value),
      recordedOn: row.recordedOn,
      notes: row.notes ?? ''
    });
    this.viewMode.set('numeric');
  }

  cancelEditPr(): void {
    this.editingPrId.set(null);
    this.prForm.reset({
      exerciseName: '',
      recordType: 'WEIGHT_KG',
      value: 100,
      recordedOn: this.todayKey,
      notes: ''
    });
  }

  formatDelta(delta: number): string {
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)} kg`;
  }

  prUnit(recordType: string): string {
    switch (recordType) {
      case 'WEIGHT_KG':
        return 'kg';
      case 'REPS':
        return 'reps';
      case 'DURATION_SECONDS':
        return 'sec';
      case 'DISTANCE_M':
        return 'm';
      default:
        return '';
    }
  }

  private reloadStrength(): void {
    this.api.listStrengthProgress().subscribe({
      next: (rows) => {
        this.strengthExercises.set(rows);
        const selected = this.selectedExerciseKey();
        if (selected && !rows.some((r) => r.exerciseKey === selected)) {
          this.clearExercise();
        } else if (selected) {
          this.api.getStrengthProgress(selected).subscribe({
            next: (detail) => this.strengthDetail.set(detail),
            error: () => this.clearExercise()
          });
        } else if (rows.length === 1) {
          this.selectExercise(rows[0]);
        }
      },
      error: () => this.error.set('Failed to load strength progress')
    });
  }

  private reloadBody(): void {
    this.api.listWeightLogs().subscribe({
      next: (rows) => {
        this.weights.set(rows);
        this.error.set(null);
      },
      error: () => {
        if (!this.weights().length) {
          this.error.set('Failed to load weight logs');
        }
      }
    });
    this.api.getBodyWeightProgress().subscribe({
      next: (overview) => {
        this.bodyOverview.set(overview);
        if (overview.goalWeightKg != null) {
          this.goalForm.patchValue({ goalWeightKg: Number(overview.goalWeightKg) });
        }
      },
      error: () => {
        if (!this.bodyOverview()) {
          this.error.set('Failed to load body weight progress');
        }
      }
    });
    this.api.listPersonalRecords().subscribe({
      next: (rows) => this.records.set(rows),
      error: () => {
        if (!this.records().length) {
          this.error.set('Failed to load personal records');
        }
      }
    });
  }

  private commitWeight(): void {
    const body = this.weightForm.getRawValue() as WeightLogRequest;
    const id = this.editingWeightId();
    this.saving.set(true);
    const req = id
      ? this.api.updateWeightLog(id, body)
      : this.api.createWeightLog(body);

    req.subscribe({
      next: (row) => {
        this.saving.set(false);
        this.cancelEditWeight();
        if (row?.id) {
          this.weights.update((list) => {
            const without = list.filter((w) => w.id !== row.id && w.id !== id);
            return [row, ...without].sort((a, b) => b.recordedOn.localeCompare(a.recordedOn));
          });
        }
        this.reloadBody();
        if (!(row as WeightLog & { pendingSync?: boolean })?.pendingSync) {
          this.toast.success(id ? 'Weight updated' : 'Weight saved');
        }
        this.nutritionSync.syncAfterWeightLogChange().subscribe({ error: () => undefined });
      },
      error: (err) => {
        this.saving.set(false);
        const detail = this.apiErrorDetail(err) ?? (id ? 'Could not update weight' : 'Could not save weight');
        this.error.set(detail);
        this.toast.error(detail);
      }
    });
  }

  private commitPr(): void {
    const body = this.prForm.getRawValue() as PersonalRecordRequest;
    const id = this.editingPrId();
    this.saving.set(true);
    const req = id
      ? this.api.updatePersonalRecord(id, body)
      : this.api.createPersonalRecord(body);

    req.subscribe({
      next: (row) => {
        this.saving.set(false);
        this.cancelEditPr();
        if (row?.id) {
          this.records.update((list) => {
            const without = list.filter((r) => r.id !== row.id && r.id !== id);
            return [row, ...without].sort((a, b) => b.recordedOn.localeCompare(a.recordedOn));
          });
        }
        this.reloadBody();
        if (!(row as PersonalRecord & { pendingSync?: boolean })?.pendingSync) {
          this.toast.success(id ? 'Personal record updated' : 'Personal record saved');
        }
      },
      error: () => {
        this.saving.set(false);
        this.error.set(id ? 'Could not update PR' : 'Could not save PR');
        this.toast.error(id ? 'Could not update PR' : 'Could not save PR');
      }
    });
  }

  private dateGate(recordedOn: string): string | null {
    if (!recordedOn) {
      return 'Date is required';
    }
    const age = this.ageInDays(recordedOn);
    if (Number.isNaN(age)) {
      return 'Invalid date';
    }
    if (age < 0) {
      return 'Future dates are not allowed';
    }
    if (age > this.editWindowDays) {
      return `Dates older than ${this.editWindowDays} days cannot be saved or edited`;
    }
    return null;
  }

  private confirmMessage(verb: string, remainingDays: number): string {
    if (remainingDays <= 0) {
      return `This is the last day you can edit this entry. Confirm to ${verb}?`;
    }
    const unit = remainingDays === 1 ? 'day' : 'days';
    return `You have ${remainingDays} ${unit} left to edit this entry. Confirm to ${verb}?`;
  }

  /** Days since recordedOn (0 = today). Negative = future. */
  private ageInDays(recordedOn: string): number {
    const target = this.parseDateOnly(recordedOn);
    const today = this.parseDateOnly(this.todayKey);
    if (!target || !today) {
      return Number.NaN;
    }
    return Math.round((today.getTime() - target.getTime()) / 86_400_000);
  }

  private parseDateOnly(iso: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) {
      return null;
    }
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  private shiftDateKey(iso: string, days: number): string {
    const d = this.parseDateOnly(iso);
    if (!d) {
      return iso;
    }
    d.setDate(d.getDate() + days);
    return this.localDateKey(d);
  }

  private shortDate(iso: string): string {
    const d = this.parseDateOnly(iso);
    if (!d) {
      return iso.slice(5);
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  /** Hide intermediate x-axis labels when many points would collide. */
  private chartAxisLabel(label: string, index: number, total: number): string {
    if (total <= 6) {
      return label;
    }
    const step = total <= 12 ? 2 : total <= 20 ? 3 : 4;
    if (index === 0 || index === total - 1 || index % step === 0) {
      return label;
    }
    return '';
  }

  private trimNum(value: number, maxFrac = 1): string {
    const fixed = Number(value).toFixed(maxFrac);
    return fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  }

  private apiErrorDetail(err: unknown): string | null {
    const detail = (err as { error?: { detail?: unknown; message?: unknown } } | null)?.error;
    if (typeof detail?.detail === 'string' && detail.detail.trim()) {
      return detail.detail;
    }
    if (typeof detail?.message === 'string' && detail.message.trim()) {
      return detail.message;
    }
    return null;
  }

  private localDateKey(date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private linePath(pts: Array<{ x: number; y: number }>): string {
    if (pts.length < 2) {
      return '';
    }
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }

  private areaPath(pts: Array<{ x: number; y: number }>): string {
    if (pts.length < 2) {
      return '';
    }
    const baseline = this.chartH - this.chartPad.bottom;
    const line = this.linePath(pts);
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `${line} L ${last.x.toFixed(1)} ${baseline} L ${first.x.toFixed(1)} ${baseline} Z`;
  }

  private yTicks(rawMin: number, rawMax: number): Array<{ value: number; y: number; label: string }> {
    let min = rawMin;
    let max = rawMax;
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const pad = (max - min) * 0.12;
    min -= pad;
    max += pad;
    const { top, bottom } = this.chartPad;
    const innerH = this.chartH - top - bottom;
    return [0, 0.5, 1].map((t) => {
      const value = max - t * (max - min);
      return {
        value,
        y: top + t * innerH,
        label: value.toFixed(1)
      };
    });
  }

  readonly recordTypeOptions: AppSelectOption[] = [
    { value: 'WEIGHT_KG', label: 'Weight (kg)' },
    { value: 'REPS', label: 'Reps' },
    { value: 'DURATION_SECONDS', label: 'Duration (sec)' },
    { value: 'DISTANCE_M', label: 'Distance (m)' }
  ];
}
