import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { CalendarDay, CalendarResponse } from '../../core/models';

@Component({
  selector: 'app-workout-calendar',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './workout-calendar.component.html',
  styleUrl: './workout-calendar.component.scss'
})
export class WorkoutCalendarComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly cursor = signal(this.startOfMonth(new Date()));
  readonly calendar = signal<CalendarResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);
  readonly selectedDate = signal<string | null>(null);

  readonly monthLabel = computed(() => {
    const d = this.cursor();
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  });

  readonly cells = computed(() => {
    const month = this.cursor();
    const cal = this.calendar();
    const byDate = new Map<string, CalendarDay>();
    for (const day of cal?.days ?? []) {
      byDate.set(day.date, day);
    }

    const first = this.startOfMonth(month);
    const startPad = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const todayKey = this.dateKey(new Date());
    const cells: Array<{
      key: string;
      day: number | null;
      inMonth: boolean;
      isToday: boolean;
      isFuture: boolean;
      workoutCount: number;
      workouts: CalendarDay['workouts'];
    }> = [];

    for (let i = 0; i < startPad; i++) {
      cells.push({
        key: `pad-${i}`,
        day: null,
        inMonth: false,
        isToday: false,
        isFuture: false,
        workoutCount: 0,
        workouts: []
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(first.getFullYear(), first.getMonth(), day);
      const key = this.dateKey(date);
      const entry = byDate.get(key);
      cells.push({
        key,
        day,
        inMonth: true,
        isToday: key === todayKey,
        isFuture: key > todayKey,
        workoutCount: entry?.workoutCount ?? 0,
        workouts: entry?.workouts ?? []
      });
    }

    return cells;
  });

  readonly selectedDay = computed(() => {
    const key = this.selectedDate();
    if (!key) {
      return null;
    }
    return this.cells().find((c) => c.key === key) ?? null;
  });

  ngOnInit(): void {
    this.reload();
  }

  prevMonth(): void {
    const d = this.cursor();
    this.cursor.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.selectedDate.set(null);
    this.reload();
  }

  nextMonth(): void {
    const d = this.cursor();
    this.cursor.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.selectedDate.set(null);
    this.reload();
  }

  selectDay(key: string, inMonth: boolean): void {
    if (!inMonth) {
      return;
    }
    this.selectedDate.set(key);
  }

  openWorkout(id: string): void {
    void this.router.navigate(['/app/workouts', id]);
  }

  dotCount(count: number): number[] {
    return Array.from({ length: Math.min(count, 3) }, (_, i) => i);
  }

  private reload(): void {
    const month = this.cursor();
    const from = this.dateKey(this.startOfMonth(month));
    const to = this.dateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    this.loading.set(true);
    this.api.getWorkoutCalendar(from, to).subscribe({
      next: (res) => {
        this.calendar.set(res);
        this.loading.set(false);
        this.error.set(null);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load calendar');
      }
    });
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private dateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
