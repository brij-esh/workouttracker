import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { ApiService } from '../core/api.service';
import { RegionService } from '../core/region.service';
import { NotificationBadgeService } from '../core/notification-badge.service';
import { ActiveWorkoutSessionService } from '../core/active-workout-session.service';
import { WorkoutOsNotificationService } from '../core/workout-os-notification.service';
import { OfflineOutboxService } from '../core/offline-outbox.service';
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
export class ShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly brand = APP_BRAND;
  readonly badge = inject(NotificationBadgeService);
  readonly outbox = inject(OfflineOutboxService);
  readonly session = inject(ActiveWorkoutSessionService);
  private readonly api = inject(ApiService);
  private readonly region = inject(RegionService);
  private readonly router = inject(Router);
  /** Keep OS workout notifications alive for the shell lifetime. */
  private readonly workoutOsNotif = inject(WorkoutOsNotificationService);

  ngOnInit(): void {
    void this.workoutOsNotif;
    this.region.refresh();
    this.syncRegionToProfile();
    this.badge.refresh();
    this.recoverActiveSession();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.badge.refresh());
  }

  /** Hard refresh into Home so the app reloads cleanly. */
  hardRefreshHome(): void {
    window.location.assign('/app');
  }

  openActiveWorkout(): void {
    const active = this.session.active();
    if (!active) {
      return;
    }
    this.session.show();
    void this.router.navigate(['/app/workouts', active.workoutId]);
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
