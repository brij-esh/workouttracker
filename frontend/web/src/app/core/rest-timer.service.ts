import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'wt.restTimer.v1';

interface StoredRest {
  targetAt: number;
  totalSeconds: number;
  label: string | null;
}

@Injectable({ providedIn: 'root' })
export class RestTimerService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private targetAt = 0;

  private readonly remainingMs = signal(0);
  private readonly running = signal(false);
  private readonly totalSeconds = signal(0);
  private readonly label = signal<string | null>(null);

  readonly secondsLeft = computed(() => Math.ceil(this.remainingMs() / 1000));
  readonly isRunning = computed(() => this.running());
  readonly display = computed(() => {
    const total = Math.max(0, this.secondsLeft());
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  });
  readonly progress = computed(() => {
    const total = this.totalSeconds();
    if (total <= 0) {
      return 0;
    }
    return Math.min(1, Math.max(0, 1 - this.remainingMs() / (total * 1000)));
  });
  readonly activeLabel = computed(() => this.label());

  constructor() {
    this.restore();
  }

  start(seconds: number, label?: string): void {
    const secs = Math.max(1, Math.floor(seconds || 90));
    this.stopInterval();
    this.totalSeconds.set(secs);
    this.remainingMs.set(secs * 1000);
    this.label.set(label ?? null);
    this.running.set(true);
    this.targetAt = Date.now() + secs * 1000;
    this.persist();
    this.tick();
  }

  skip(): void {
    this.clear();
  }

  /** Stops rest timer and hides UI (e.g. when ending a live session). */
  clear(): void {
    this.remainingMs.set(0);
    this.running.set(false);
    this.totalSeconds.set(0);
    this.label.set(null);
    this.targetAt = 0;
    this.stopInterval();
    this.clearStorage();
  }

  addSeconds(seconds: number): void {
    if (!this.running()) {
      return;
    }
    this.targetAt += seconds * 1000;
    this.totalSeconds.update((t) => t + seconds);
    this.persist();
    this.tickOnce();
  }

  private tick(): void {
    this.intervalId = setInterval(() => this.tickOnce(), 200);
  }

  private tickOnce(): void {
    const left = this.targetAt - Date.now();
    if (left <= 0) {
      this.remainingMs.set(0);
      this.running.set(false);
      this.stopInterval();
      this.clearStorage();
      return;
    }
    this.remainingMs.set(left);
  }

  private stopInterval(): void {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private persist(): void {
    if (!this.running() || this.targetAt <= 0) {
      this.clearStorage();
      return;
    }
    const payload: StoredRest = {
      targetAt: this.targetAt,
      totalSeconds: this.totalSeconds(),
      label: this.label()
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }

  private restore(): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as StoredRest;
      if (!parsed?.targetAt || !parsed.totalSeconds) {
        this.clearStorage();
        return;
      }
      const left = parsed.targetAt - Date.now();
      if (left <= 0) {
        this.clearStorage();
        return;
      }
      this.targetAt = parsed.targetAt;
      this.totalSeconds.set(parsed.totalSeconds);
      this.label.set(parsed.label ?? null);
      this.remainingMs.set(left);
      this.running.set(true);
      this.tick();
    } catch {
      this.clearStorage();
    }
  }

  private clearStorage(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
