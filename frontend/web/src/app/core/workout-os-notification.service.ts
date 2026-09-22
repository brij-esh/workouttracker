import { Injectable, effect, inject, untracked } from '@angular/core';
import { ActiveWorkoutSession, ActiveWorkoutSessionService } from './active-workout-session.service';
import { APP_BRAND } from './app-brand';

const NOTIF_TAG = 'wt.active-workout';
/** How often to refresh the shade while the timer is running (not every second). */
const REFRESH_MS = 60_000;

/**
 * Shows one OS notification for an active workout and updates it sparingly
 * (start / pause / resume / every minute) so the shade is not spammed.
 * The browser tab title still shows a live clock.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutOsNotificationService {
  private readonly session = inject(ActiveWorkoutSessionService);
  private lastPostedAt = 0;
  private lastPaused: boolean | null = null;
  private lastWorkoutId: string | null = null;
  private current: Notification | null = null;

  constructor() {
    effect(() => {
      const active = this.session.active();
      const display = this.session.display();
      const paused = this.session.isPaused();
      untracked(() => this.sync(active, display, paused));
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

  private sync(active: ActiveWorkoutSession | null, display: string, paused: boolean): void {
    if (!active) {
      this.clear();
      if (typeof document !== 'undefined') {
        document.title = APP_BRAND.name;
      }
      return;
    }

    if (typeof document !== 'undefined') {
      document.title = `⏱ ${display} · ${active.title}`;
    }

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    const now = Date.now();
    const statusChanged = this.lastPaused !== paused;
    const workoutChanged = this.lastWorkoutId !== active.workoutId;
    const dueForRefresh = now - this.lastPostedAt >= REFRESH_MS;
    const firstPost = this.lastPostedAt === 0;

    if (!firstPost && !statusChanged && !workoutChanged && !dueForRefresh) {
      return;
    }

    this.lastPaused = paused;
    this.lastWorkoutId = active.workoutId;
    this.lastPostedAt = now;
    this.post(active, display, paused);
  }

  private post(active: ActiveWorkoutSession, display: string, paused: boolean): void {
    const status = paused ? 'Paused' : 'In progress';
    const body = paused
      ? `${active.title} · paused at ${display}`
      : `${active.title} · ${display} (updates every min)`;

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
    this.lastPostedAt = 0;
    this.lastPaused = null;
    this.lastWorkoutId = null;
    try {
      this.current?.close();
    } catch {
      /* ignore */
    }
    this.current = null;
  }
}
