import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { ApiService } from '../core/api.service';
import { RegionService } from '../core/region.service';
import { NotificationBadgeService } from '../core/notification-badge.service';
import { ActiveWorkoutSessionService } from '../core/active-workout-session.service';
import { WorkoutOsNotificationService } from '../core/workout-os-notification.service';
import { OfflineOutboxService } from '../core/offline-outbox.service';
import { NativePlatformService } from '../core/native-platform.service';
import { canResumePausedWorkout } from '../core/date-window';
import { APP_BRAND } from '../core/app-brand';
import { ToastHostComponent } from '../core/toast-host.component';
import { ActiveWorkoutFabComponent } from '../core/active-workout-fab.component';
import { ConfirmDialogHostComponent } from '../core/confirm-dialog-host.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ToastHostComponent,
    ActiveWorkoutFabComponent,
    ConfirmDialogHostComponent
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly brand = APP_BRAND;
  readonly badge = inject(NotificationBadgeService);
  readonly outbox = inject(OfflineOutboxService);
  readonly session = inject(ActiveWorkoutSessionService);
  private readonly api = inject(ApiService);
  private readonly region = inject(RegionService);
  private readonly router = inject(Router);
  private readonly native = inject(NativePlatformService);
  /** Keep OS workout notifications alive for the shell lifetime. */
  private readonly workoutOsNotif = inject(WorkoutOsNotificationService);

  private readonly subs = new Subscription();
  private appStateHandle: { remove: () => Promise<void> } | null = null;

  ngOnInit(): void {
    void this.workoutOsNotif;
    this.region.refresh();
    this.syncRegionToProfile();
    this.badge.refresh({ force: true });
    this.recoverActiveSession();
    // Only refresh badge when entering the inbox — not on every tab switch.
    this.subs.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => {
          if (e.urlAfterRedirects.includes('/notifications')) {
            this.badge.refresh({ force: true });
          }
        })
    );
    void this.listenAppResume();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    void this.appStateHandle?.remove();
  }

  /** Go Home without a full page reload (avoids a visible UI flash). */
  hardRefreshHome(): void {
    const url = this.router.url.split('?')[0];
    if (url === '/app' || url === '/app/') {
      this.badge.refresh({ force: true });
      return;
    }
    void this.router.navigateByUrl('/app');
  }

  openActiveWorkout(): void {
    const active = this.session.active();
    if (!active) {
      return;
    }
    this.session.show();
    void this.router.navigate(['/app/workouts', active.workoutId]);
  }

  private async listenAppResume(): Promise<void> {
    if (!this.native.isNative) {
      return;
    }
    try {
      const { App } = await import('@capacitor/app');
      this.appStateHandle = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          this.badge.refresh();
        }
      });
    } catch {
      /* web / plugin unavailable */
    }
  }

  /** Reattach floating timer if backend has an open session (e.g. new tab). */
  private recoverActiveSession(): void {
    if (this.session.hasSession()) {
      return;
    }
    this.api.listWorkouts().subscribe({
      next: (workouts) => {
        if (this.session.hasSession()) {
          return;
        }
        const active = workouts.find(
          (w) =>
            w.status === 'IN_PROGRESS' ||
            (w.status === 'PAUSED' && canResumePausedWorkout(w))
        );
        if (active) {
          this.session.attachFromServer(active);
        }
      },
      error: () => undefined
    });
  }

  /** Persist detected timezone/region when missing or changed. */
  private syncRegionToProfile(): void {
    const detected = this.region.detected();
    this.api.getMyProfile().subscribe({
      next: (profile) => {
        this.auth.setProfileDisplayName(profile.displayName);
        const timezoneChanged = profile.timezone !== detected.timezone;
        const regionChanged = (profile.region ?? null) !== (detected.region ?? null);
        if (!timezoneChanged && !regionChanged) {
          return;
        }
        this.api
          .updateProfile({
            displayName: profile.displayName,
            heightCm: profile.heightCm,
            weightKg: profile.weightKg,
            dateOfBirth: profile.dateOfBirth,
            gender: profile.gender,
            fitnessGoal: profile.fitnessGoal,
            activityLevel: profile.activityLevel,
            preferredUnits: profile.preferredUnits ?? detected.suggestedUnits,
            timezone: detected.timezone,
            region: detected.region,
            onboardingCompleted: profile.onboardingCompleted
          })
          .subscribe({ error: () => undefined });
      },
      error: () => undefined
    });
  }
}
