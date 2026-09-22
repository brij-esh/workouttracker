import { Injectable, effect, inject, untracked } from '@angular/core';
import { ActiveWorkoutSession, ActiveWorkoutSessionService } from './active-workout-session.service';
import { APP_BRAND } from './app-brand';

const NOTIF_TAG = 'wt.active-workout';

/**
 * Keeps a phone notification shade entry (where supported) updated with the
 * live workout timer, and mirrors the time into the browser tab title.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutOsNotificationService {
  private readonly session = inject(ActiveWorkoutSessionService);
  private lastPostedAt = 0;
  private lastBody = '';

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

    const status = paused ? 'Paused' : 'In progress';
    if (typeof document !== 'undefined') {
      document.title = `⏱ ${display} · ${active.title}`;
    }

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    const body = `${active.title} · ${display}`;
    const now = Date.now();
    // Avoid spamming the shade — refresh about once per second (or on pause flip).
    if (body === this.lastBody && now - this.lastPostedAt < 950) {
      return;
    }
    this.lastBody = body;
    this.lastPostedAt = now;

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
      /* ignore */
    }
  }

  private clear(): void {
    this.lastBody = '';
    this.lastPostedAt = 0;
  }
}
