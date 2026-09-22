import { Routes } from '@angular/router';
import { authGuard, guestGuard, verifyEmailGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'app' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'verify-email',
    canActivate: [verifyEmailGuard],
    loadComponent: () =>
      import('./features/auth/verify-email.component').then((m) => m.VerifyEmailComponent)
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/home/home.component').then((m) => m.HomeComponent)
      },
      {
        path: 'workouts',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/workouts/workouts-hub.component').then(
                (m) => m.WorkoutsHubComponent
              ),
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'start' },
              {
                path: 'start',
                loadComponent: () =>
                  import('./features/workouts/workout-start.component').then(
                    (m) => m.WorkoutStartComponent
                  )
              },
              {
                path: 'history',
                loadComponent: () =>
                  import('./features/workouts/workouts.component').then(
                    (m) => m.WorkoutsComponent
                  )
              },
              {
                path: 'plans',
                loadComponent: () =>
                  import('./features/workouts/workout-plans.component').then(
                    (m) => m.WorkoutPlansComponent
                  )
              },
              {
                path: 'plans/:id',
                loadComponent: () =>
                  import('./features/workouts/workout-plan-detail.component').then(
                    (m) => m.WorkoutPlanDetailComponent
                  )
              }
            ]
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/workouts/workout-detail.component').then(
                (m) => m.WorkoutDetailComponent
              )
          }
        ]
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./features/library/exercise-library.component').then(
            (m) => m.ExerciseLibraryComponent
          )
      },
      {
        path: 'library/:id',
        loadComponent: () =>
          import('./features/library/exercise-library-detail.component').then(
            (m) => m.ExerciseLibraryDetailComponent
          )
      },
      {
        path: 'progress',
        loadComponent: () =>
          import('./features/progress/progress.component').then((m) => m.ProgressComponent)
      },
      {
        path: 'nutrition',
        loadComponent: () =>
          import('./features/nutrition/nutrition.component').then((m) => m.NutritionComponent)
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(
            (m) => m.NotificationsComponent
          )
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent)
      },
      {
        path: 'profile/archived',
        loadComponent: () =>
          import('./features/profile/archived.component').then((m) => m.ArchivedComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'app' }
];
