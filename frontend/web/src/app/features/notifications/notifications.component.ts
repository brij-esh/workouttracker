import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { NotificationBadgeService } from '../../core/notification-badge.service';
import { ToastService } from '../../core/toast.service';
import { NotificationItem } from '../../core/models';

type InboxTab = 'all' | 'unread';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly badge = inject(NotificationBadgeService);

  readonly pageSize = 20;
  readonly tab = signal<InboxTab>('all');
  readonly rows = signal<NotificationItem[]>([]);
  readonly page = signal(0);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly hasNext = signal(false);
  readonly hasPrevious = signal(false);
  readonly loading = signal(false);
  readonly clearing = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPage(0);
    this.badge.refresh();
  }

  setTab(next: InboxTab): void {
    if (this.tab() === next) {
      return;
    }
    this.tab.set(next);
    this.rows.set([]);
    this.loadPage(0);
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listNotifications({
        page,
        size: this.pageSize,
        unreadOnly: this.tab() === 'unread'
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.content);
          this.page.set(res.page);
          this.totalElements.set(res.totalElements);
          this.totalPages.set(res.totalPages);
          this.hasNext.set(res.hasNext);
          this.hasPrevious.set(res.hasPrevious);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Failed to load notifications');
        }
      });
  }

  prevPage(): void {
    if (!this.hasPrevious() || this.loading()) {
      return;
    }
    this.loadPage(this.page() - 1);
  }

  nextPage(): void {
    if (!this.hasNext() || this.loading()) {
      return;
    }
    this.loadPage(this.page() + 1);
  }

  markRead(id: string): void {
    this.api.markRead(id).subscribe({
      next: () => {
        this.badge.adjust(-1);
        this.loadPage(this.page());
      },
      error: () => this.toast.error('Could not update notification')
    });
  }

  markAll(): void {
    this.api.markAllRead().subscribe({
      next: (res) => {
        this.badge.set(res.unreadCount ?? 0);
        this.loadPage(0);
      },
      error: () => this.toast.error('Could not update notifications')
    });
  }

  clearOne(row: NotificationItem): void {
    const wasUnread = !row.read;
    this.api.deleteNotification(row.id).subscribe({
      next: () => {
        if (wasUnread) {
          this.badge.adjust(-1);
        }
        this.loadPage(this.page());
      },
      error: () => this.toast.error('Could not clear notification')
    });
  }

  async clearAll(): Promise<void> {
    if (!this.totalElements() && !this.rows().length) {
      return;
    }
    const ok = await this.confirm.ask({
      title: 'Clear all notifications?',
      message: 'This permanently removes every alert from your inbox.',
      confirmLabel: 'Clear all',
      danger: true
    });
    if (!ok) {
      return;
    }
    this.clearing.set(true);
    this.api.clearAllNotifications().subscribe({
      next: () => {
        this.clearing.set(false);
        this.rows.set([]);
        this.totalElements.set(0);
        this.totalPages.set(0);
        this.page.set(0);
        this.hasNext.set(false);
        this.hasPrevious.set(false);
        this.badge.set(0);
      },
      error: () => {
        this.clearing.set(false);
        this.toast.error('Could not clear notifications');
      }
    });
  }

  typeLabel(type: string): string {
    switch (type) {
      case 'MOTIVATIONAL_QUOTE':
        return 'Morning quote';
      case 'WORKOUT_REMINDER':
        return 'Workout update';
      case 'PROGRESS_UPDATE':
        return 'Progress';
      case 'NUTRITION_REMINDER':
        return 'Nutrition';
      case 'WATER_REMINDER':
        return 'Water reminder';
      case 'SYSTEM':
        return 'System';
      default:
        return type.replace(/_/g, ' ').toLowerCase();
    }
  }

  deepLink(n: NotificationItem): string | null {
    if (!n.referenceId) {
      if (n.type === 'WATER_REMINDER' || n.type === 'NUTRITION_REMINDER') {
        return '/app/nutrition';
      }
      return null;
    }
    if (n.type === 'WORKOUT_REMINDER') {
      return `/app/workouts/${n.referenceId}`;
    }
    if (n.type === 'WATER_REMINDER' || n.type === 'NUTRITION_REMINDER') {
      return '/app/nutrition';
    }
    if (n.type === 'PROGRESS_UPDATE') {
      return '/app/progress';
    }
    return null;
  }
}
