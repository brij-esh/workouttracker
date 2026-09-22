import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { WorkoutConsistency } from '../../core/models';

@Component({
  selector: 'app-consistency-progress',
  standalone: true,
  templateUrl: './consistency-progress.component.html',
  styleUrl: './consistency-progress.component.scss'
})
export class ConsistencyProgressComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly data = signal<WorkoutConsistency | null>(null);
  readonly loading = signal(false);
  readonly month = signal(this.monthKey());
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  shiftMonth(delta: number): void {
    const [y, m] = this.month().split('-').map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    this.month.set(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    );
    this.reload();
  }

  cellTitle(cell: {
    date: string;
    workoutCount: number;
    planned: boolean;
    missed: boolean;
  }): string {
    const parts = [
      cell.date,
      `${cell.workoutCount} workout${cell.workoutCount === 1 ? '' : 's'}`
    ];
    if (cell.missed) {
      parts.push('missed planned day');
    } else if (cell.planned) {
      parts.push('planned');
    }
    return parts.join(' · ');
  }

  /** Short label for heatmap cells, e.g. Jan 1 */
  cellDateLabel(isoDate: string): string {
    const parts = isoDate?.slice(0, 10).split('-');
    if (!parts || parts.length < 3) {
      return '';
    }
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!month || !day) {
      return '';
    }
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return `${months[month - 1]} ${day}`;
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getWorkoutConsistency(this.month()).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load workout consistency');
        this.toast.error('Could not load workout consistency');
      }
    });
  }

  private monthKey(date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
