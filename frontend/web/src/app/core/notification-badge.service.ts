import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

/** Shared unread count for shell badge, home, and inbox. */
@Injectable({ providedIn: 'root' })
export class NotificationBadgeService {
  private readonly api = inject(ApiService);
  private readonly countSignal = signal(0);

  readonly count = this.countSignal.asReadonly();

  refresh(): void {
    this.api.unreadCount().subscribe({
      next: (res) => this.countSignal.set(res.unreadCount ?? 0),
      error: () => undefined
    });
  }

  set(count: number): void {
    this.countSignal.set(Math.max(0, count));
  }

  adjust(delta: number): void {
    this.countSignal.update((n) => Math.max(0, n + delta));
  }
}
