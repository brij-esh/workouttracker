import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { RestTimerService } from './rest-timer.service';
import { RESUME_WINDOW_MS } from './date-window';
import { WorkoutOsNotificationService } from './workout-os-notification.service';

export interface ActiveWorkoutSession {
  workoutId: string;
  title: string;
  startedAtMs: number | null;
  baseElapsedMs: number;
  running: boolean;
  /** When the session was paused (for 1-hour resume window). */
  pausedAtMs: number | null;
}

interface StoredSession extends ActiveWorkoutSession {
  minimized: boolean;
}

const STORAGE_KEY = 'wt.activeWorkout.v1';

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function readStorage(key: string): string | null {
  try {
    const local = localStorage.getItem(key);
    if (local) {
      return local;
    }
  } catch {
    /* ignore */
  }
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

@Injectable({ providedIn: 'root' })
export class ActiveWorkoutSessionService {
  private readonly rest = inject(RestTimerService);
  private readonly injector = inject(Injector);
  private readonly session = signal<ActiveWorkoutSession | null>(null);
  private readonly minimized = signal(false);
  private readonly nowMs = signal(Date.now());
  private tickHandle: ReturnType<typeof setInterval> | null = null;

  readonly active = this.session.asReadonly();
  readonly isMinimized = this.minimized.asReadonly();
  readonly hasSession = computed(() => this.session() != null);

  readonly elapsedMs = computed(() => {
    const s = this.session();
    if (!s) {
      return 0;
    }
    if (!s.running || s.startedAtMs == null) {
      return s.baseElapsedMs;
    }
    return s.baseElapsedMs + Math.max(0, this.nowMs() - s.startedAtMs);
  });

  readonly display = computed(() => this.format(this.elapsedMs()));

  readonly minutesRounded = computed(() => {
    const ms = this.elapsedMs();
    if (ms <= 0) {
      return 0;
    }
    return Math.max(1, Math.round(ms / 60000));
  });

  readonly isPaused = computed(() => {
    const s = this.session();
    return !!s && !s.running;
  });

  readonly canResume = computed(() => {
    const s = this.session();
    if (!s || s.running) {
      return false;
    }
    if (s.pausedAtMs == null) {
      return true;
    }
    return this.nowMs() - s.pausedAtMs <= RESUME_WINDOW_MS;
  });

  readonly resumeRemainingMs = computed(() => {
    const s = this.session();
    if (!s || s.running || s.pausedAtMs == null) {
      return 0;
    }
    return Math.max(0, RESUME_WINDOW_MS - (this.nowMs() - s.pausedAtMs));
  });

  constructor() {
    this.restore();
    if (this.session()?.running) {
      this.ensureTick();
    } else if (this.session() && !this.session()!.running) {
      this.ensurePauseWatch();
    }
  }

  isActiveFor(workoutId: string): boolean {
    return this.session()?.workoutId === workoutId;
  }

  start(workoutId: string, title: string, resumeElapsedMs = 0): void {
    this.clearTick();
    this.session.set({
      workoutId,
      title: title.trim() || 'Workout',
      startedAtMs: Date.now(),
      baseElapsedMs: Math.max(0, resumeElapsedMs),
      running: true,
      pausedAtMs: null
    });
    this.minimized.set(false);
    this.nowMs.set(Date.now());
    this.ensureTick();
    this.persist();
    void this.injector.get(WorkoutOsNotificationService).ensurePermission();
  }

  pause(): void {
    const s = this.session();
    if (!s?.running || s.startedAtMs == null) {
      return;
    }
    const elapsed = s.baseElapsedMs + (Date.now() - s.startedAtMs);
    this.session.set({
      ...s,
      running: false,
      startedAtMs: null,
      baseElapsedMs: elapsed,
      pausedAtMs: Date.now()
    });
    this.clearTick();
    this.ensurePauseWatch();
    this.persist();
  }

  /** @returns false when the 1-hour resume window has expired. */
  resume(): boolean {
    const s = this.session();
    if (!s || s.running) {
      return true;
    }
    if (s.pausedAtMs != null && Date.now() - s.pausedAtMs > RESUME_WINDOW_MS) {
      return false;
    }
    this.session.set({
      ...s,
      running: true,
      startedAtMs: Date.now(),
      pausedAtMs: null
    });
    this.nowMs.set(Date.now());
    this.ensureTick();
    this.persist();
    return true;
  }

  toggleRun(): boolean {
    if (this.session()?.running) {
      this.pause();
      return true;
    }
    return this.resume();
  }

  hide(): void {
    this.minimized.set(true);
    this.persist();
  }

  show(): void {
    this.minimized.set(false);
    this.persist();
  }

  toggleVisibility(): void {
    if (this.minimized()) {
      this.show();
    } else {
      this.hide();
    }
  }

  updateTitle(title: string): void {
    const s = this.session();
    if (!s) {
      return;
    }
    this.session.set({ ...s, title: title.trim() || s.title });
    this.persist();
  }

  /** Ends the live session and returns elapsed minutes for optional save. */
  end(): { workoutId: string; minutes: number; elapsedMs: number } | null {
    const s = this.session();
    if (!s) {
      return null;
    }
    let elapsed = s.baseElapsedMs;
    if (s.running && s.startedAtMs != null) {
      elapsed = s.baseElapsedMs + (Date.now() - s.startedAtMs);
      this.session.set({
        ...s,
        running: false,
        startedAtMs: null,
        baseElapsedMs: elapsed,
        pausedAtMs: Date.now()
      });
    }
    const result = {
      workoutId: s.workoutId,
      minutes: Math.max(1, Math.round(elapsed / 60000)) || this.minutesRounded(),
      elapsedMs: Math.max(0, elapsed)
    };
    this.clearTick();
    this.session.set(null);
    this.minimized.set(false);
    this.clearStorage();
    this.rest.clear();
    return result;
  }

  /** Drop local session without completing (e.g. resume window expired). */
  clearLocal(): void {
    this.clearTick();
    this.session.set(null);
    this.minimized.set(false);
    this.clearStorage();
    this.rest.clear();
  }

  /**
   * Restore FAB from a backend IN_PROGRESS / PAUSED workout
   * when local storage was cleared (new tab / device).
   */
  attachFromServer(workout: {
    id: string;
    name: string;
    status?: string | null;
    elapsedMs?: number | null;
    pausedAt?: string | null;
  }): void {
    if (this.hasSession()) {
      return;
    }
    const running = workout.status === 'IN_PROGRESS';
    let pausedAtMs: number | null = null;
    if (!running) {
      pausedAtMs = workout.pausedAt ? Date.parse(workout.pausedAt) : Date.now();
      if (Number.isNaN(pausedAtMs)) {
        pausedAtMs = Date.now();
      }
      if (Date.now() - pausedAtMs > RESUME_WINDOW_MS) {
        return;
      }
    }
    this.clearTick();
    this.session.set({
      workoutId: workout.id,
      title: workout.name.trim() || 'Workout',
      startedAtMs: running ? Date.now() : null,
      baseElapsedMs: Math.max(0, Number(workout.elapsedMs) || 0),
      running,
      pausedAtMs: running ? null : pausedAtMs
    });
    this.minimized.set(false);
    this.nowMs.set(Date.now());
    if (running) {
      this.ensureTick();
      void this.injector.get(WorkoutOsNotificationService).ensurePermission();
    } else {
      this.ensurePauseWatch();
    }
    this.persist();
  }

  private ensureTick(): void {
    this.clearTick();
    this.tickHandle = setInterval(() => {
      if (!this.session()?.running) {
        this.clearTick();
        return;
      }
      this.nowMs.set(Date.now());
    }, 250);
  }

  private ensurePauseWatch(): void {
    this.clearTick();
    this.tickHandle = setInterval(() => {
      this.nowMs.set(Date.now());
      const s = this.session();
      if (!s || s.running) {
        this.clearTick();
        return;
      }
    }, 1000);
  }

  private clearTick(): void {
    if (this.tickHandle != null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  private persist(): void {
    const s = this.session();
    if (!s) {
      this.clearStorage();
      return;
    }
    const payload: StoredSession = { ...s, minimized: this.minimized() };
    writeStorage(STORAGE_KEY, JSON.stringify(payload));
  }

  private restore(): void {
    try {
      const raw = readStorage(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as StoredSession;
      if (!parsed?.workoutId || !parsed.title) {
        return;
      }
      const pausedAtMs =
        parsed.pausedAtMs != null
          ? Number(parsed.pausedAtMs)
          : !parsed.running
            ? Date.now()
            : null;
      if (!parsed.running && pausedAtMs != null && Date.now() - pausedAtMs > RESUME_WINDOW_MS) {
        this.clearStorage();
        return;
      }
      this.session.set({
        workoutId: parsed.workoutId,
        title: parsed.title,
        startedAtMs: parsed.running ? parsed.startedAtMs ?? Date.now() : null,
        baseElapsedMs: Number(parsed.baseElapsedMs) || 0,
        running: !!parsed.running,
        pausedAtMs: parsed.running ? null : pausedAtMs
      });
      this.minimized.set(!!parsed.minimized);
      this.nowMs.set(Date.now());
    } catch {
      this.clearStorage();
    }
  }

  private clearStorage(): void {
    removeStorage(STORAGE_KEY);
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
