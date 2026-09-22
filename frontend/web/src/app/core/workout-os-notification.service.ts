import { Injectable, effect, inject, untracked } from '@angular/core';
import { ActiveWorkoutSession, ActiveWorkoutSessionService } from './active-workout-session.service';
import { APP_BRAND } from './app-brand';

const NOTIF_TAG = 'wt.active-workout';

/**
 * One quiet OS notification for an active workout.
 * Posted only on start / pause / resume / end — never on every timer tick.
 * Live time stays in the top-bar chip only.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutOsNotificationService {
  private readonly session = inject(ActiveWorkoutSessionService);
  private lastPaused: boolean | null = null;
  private lastWorkoutId: string | null = null;
  private current: Notification | null = null;
  private baseTitle = APP_BRAND.name;

  constructor() {
    if (typeof document !== 'undefined') {
      this.baseTitle = document.title || APP_BRAND.name;
    }
    effect(() => {
      const active = this.session.active();
      const paused = this.session.isPaused();
      // Do not depend on display()/elapsed — that ticks every second.
      untracked(() => this.sync(active, paused));
    });
  }

  /** Prefer calling from a user gesture (starting a workout). */
  async ensurePermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof Notification === 'undefined') {
      return 'unsupported';
    }
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return Notification.permission;
    }
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }

  private sync(active: ActiveWorkoutSession | null, paused: boolean): void {
    if (!active) {
      this.clear();
      return;
    }

    const statusChanged = this.lastPaused !== paused;
    const workoutChanged = this.lastWorkoutId !== active.workoutId;
    if (!statusChanged && !workoutChanged) {
      return;
    }

    this.lastPaused = paused;
    this.lastWorkoutId = active.workoutId;

    if (typeof document !== 'undefined') {
      document.title = paused
        ? `${APP_BRAND.name} · Paused`
        : `${APP_BRAND.name} · Workout`;
    }

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    const display = this.session.display();
    this.post(active, display, paused);
  }

  private post(active: ActiveWorkoutSession, display: string, paused: boolean): void {
    const status = paused ? 'Paused' : 'In progress';
    const body = paused
      ? `${active.title} · paused at ${display}`
      : `${active.title} · started · open app for live timer`;

    try {
      this.current?.close();
    } catch {
      /* ignore */
    }

    try {
      const options: NotificationOptions = {
        body,
        tag: NOTIF_TAG,
        silent: true,
        requireInteraction: true,
        icon: '/apple-touch-icon.png',
        data: { workoutId: active.workoutId }
      };
      const n = new Notification(`${APP_BRAND.name} · ${status}`, options);
      this.current = n;
      n.onclick = () => {
        try {
          window.focus();
        } catch {
          /* ignore */
        }
        if (!location.pathname.includes(active.workoutId)) {
          location.assign(`/app/workouts/${active.workoutId}`);
        }
        n.close();
      };
    } catch {
      this.current = null;
    }
  }

  private clear(): void {
    this.lastPaused = null;
    this.lastWorkoutId = null;
    try {
      this.current?.close();
    } catch {
      /* ignore */
    }
    this.current = null;
    if (typeof document !== 'undefined') {
      document.title = this.baseTitle || APP_BRAND.name;
    }
  }
}
