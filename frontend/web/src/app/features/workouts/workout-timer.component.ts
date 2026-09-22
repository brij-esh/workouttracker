import {
  Component,
  DestroyRef,
  computed,
  inject,
  output,
  signal
} from '@angular/core';

@Component({
  selector: 'app-workout-timer',
  standalone: true,
  templateUrl: './workout-timer.component.html',
  styleUrl: './workout-timer.component.scss'
})
export class WorkoutTimerComponent {
  private readonly destroyRef = inject(DestroyRef);

  /** Emits whole minutes for the log form (at least 1 when any time has elapsed). */
  readonly applyMinutes = output<number>();

  readonly running = signal(false);
  readonly elapsedMs = signal(0);

  readonly display = computed(() => this.format(this.elapsedMs()));
  readonly minutesRounded = computed(() => {
    const ms = this.elapsedMs();
    if (ms <= 0) {
      return 0;
    }
    return Math.max(1, Math.round(ms / 60000));
  });

  private startedAt: number | null = null;
  private baseElapsed = 0;
  private tickHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTick());
  }

  start(): void {
    if (this.running()) {
      return;
    }
    this.startedAt = Date.now();
    this.running.set(true);
    this.clearTick();
    this.tickHandle = setInterval(() => this.sync(), 200);
  }

  pause(): void {
    if (!this.running()) {
      return;
    }
    this.sync();
    this.baseElapsed = this.elapsedMs();
    this.startedAt = null;
    this.running.set(false);
    this.clearTick();
  }

  reset(): void {
    this.clearTick();
    this.running.set(false);
    this.startedAt = null;
    this.baseElapsed = 0;
    this.elapsedMs.set(0);
  }

  toggle(): void {
    if (this.running()) {
      this.pause();
    } else {
      this.start();
    }
  }

  useForLog(): void {
    this.pause();
    this.applyMinutes.emit(this.minutesRounded());
  }

  private sync(): void {
    if (this.startedAt == null) {
      return;
    }
    this.elapsedMs.set(this.baseElapsed + (Date.now() - this.startedAt));
  }

  private clearTick(): void {
    if (this.tickHandle != null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  private format(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    if (hours > 0) {
      return `${hours}:${mm}:${ss}`;
    }
    return `${mm}:${ss}`;
  }
}
