import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

const MIN_REFRESH_MS = 45_000;

/** Shared unread count for shell badge, home, and inbox. */
@Injectable({ providedIn: 'root' })
export class NotificationBadgeService {
  private readonly api = inject(ApiService);
  private readonly countSignal = signal(0);
  private lastNetworkAt = 0;
  private inflight = false;

  readonly count = this.countSignal.asReadonly();

  /**
   * Refresh unread count. Skips network when a recent fetch already ran,
   * unless `force` is true (e.g. after mark-read / pull-to-refresh).
   */
  refresh(options?: { force?: boolean }): void {
    const force = options?.force === true;
    const now = Date.now();
    if (!force && this.inflight) {
      return;
    }
    if (!force && now - this.lastNetworkAt < MIN_REFRESH_MS && this.lastNetworkAt > 0) {
      return;
    }

    this.inflight = true;
    this.api.unreadCount().subscribe({
      next: (res) => {
        this.countSignal.set(res.unreadCount ?? 0);
        this.lastNetworkAt = Date.now();
        this.inflight = false;
      },
      error: () => {
        this.inflight = false;
      }
    });
  }

  set(count: number): void {
    this.countSignal.set(Math.max(0, count));
  }

  adjust(delta: number): void {
    this.countSignal.update((n) => Math.max(0, n + delta));
  }
}
