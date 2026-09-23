import { Injectable, NgZone, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { ConfirmDialogService } from './confirm-dialog.service';

/**
 * Android hardware / gesture back:
 * 1) dismiss confirm dialogs
 * 2) run registered overlay closers (modals, sheets)
 * 3) browser / router history back
 * 4) climb to a sensible parent route
 * 5) minimize the app at the root
 */
@Injectable({ providedIn: 'root' })
export class AndroidBackButtonService {
  private readonly zone = inject(NgZone);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly overlayClosers: Array<() => boolean> = [];
  private wired = false;

  /** Register a closer (return true if the back press was consumed). */
  registerOverlay(close: () => boolean): () => void {
    this.overlayClosers.push(close);
    return () => {
      const i = this.overlayClosers.lastIndexOf(close);
      if (i >= 0) {
        this.overlayClosers.splice(i, 1);
      }
    };
  }

  async init(): Promise<void> {
    if (this.wired || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }
    this.wired = true;
    try {
      const { App } = await import('@capacitor/app');
      await App.addListener('backButton', ({ canGoBack }) => {
        this.zone.run(() => {
          void this.onBack(canGoBack, App);
        });
      });
    } catch {
      /* @capacitor/app unavailable */
    }
  }

  private async onBack(
    canGoBack: boolean,
    App: typeof import('@capacitor/app').App
  ): Promise<void> {
    if (this.confirm.state()) {
      this.confirm.cancel();
      return;
    }

    for (let i = this.overlayClosers.length - 1; i >= 0; i--) {
      if (this.overlayClosers[i]()) {
        return;
      }
    }

    // Prefer Capacitor's WebView history flag — window.history.length is unreliable in Chromium.
    if (canGoBack) {
      this.location.back();
      return;
    }

    const parent = this.parentUrl(this.router.url);
    if (parent) {
      await this.router.navigateByUrl(parent);
      return;
    }

    try {
      await App.minimizeApp();
    } catch {
      await App.exitApp();
    }
  }

  /** When WebView history is empty (deep link / cold start on a child page). */
  private parentUrl(rawUrl: string): string | null {
    const path = rawUrl.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/app';

    if (path === '/app' || path === '/login' || path === '/verify-email') {
      return null;
    }

    const segments = path.split('/').filter(Boolean);
    // app / …
    if (segments[0] !== 'app' || segments.length < 2) {
      return '/app';
    }

    // app/workouts/:id → history list
    if (segments[1] === 'workouts' && segments.length === 3 && segments[2] !== 'plans') {
      return '/app/workouts/history';
    }
    // app/workouts/plans/:id → plans list
    if (segments[1] === 'workouts' && segments[2] === 'plans' && segments.length >= 4) {
      return '/app/workouts/plans';
    }
    // app/library/:id → library
    if (segments[1] === 'library' && segments.length >= 3) {
      return '/app/library';
    }
    // app/profile/archived → profile
    if (segments[1] === 'profile' && segments.length >= 3) {
      return '/app/profile';
    }

    // Tab roots (workouts hub, nutrition, …) → home
    if (segments.length === 2) {
      return '/app';
    }
    // app/workouts/start|history|plans → workouts hub home via start
    if (segments[1] === 'workouts' && segments.length === 3) {
      return '/app';
    }

    return '/app';
  }
}
