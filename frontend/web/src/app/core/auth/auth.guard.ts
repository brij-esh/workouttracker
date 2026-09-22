import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.ready).pipe(
    filter((ready) => ready),
    take(1),
    map(() => {
      if (!auth.isLoggedIn()) {
        return router.createUrlTree(['/login']);
      }
      if (auth.isAccountLocked()) {
        return router.createUrlTree(['/verify-email']);
      }
      return true;
    })
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.ready).pipe(
    filter((ready) => ready),
    take(1),
    map(() => {
      if (!auth.isLoggedIn()) {
        return true;
      }
      if (auth.isAccountLocked()) {
        return router.createUrlTree(['/verify-email']);
      }
      return router.createUrlTree(['/app']);
    })
  );
};

/** Only for password users waiting on email verification. */
export const verifyEmailGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.ready).pipe(
    filter((ready) => ready),
    take(1),
    map(() => {
      if (!auth.isLoggedIn()) {
        return router.createUrlTree(['/login']);
      }
      if (!auth.isAccountLocked()) {
        return router.createUrlTree(['/app']);
      }
      return true;
    })
  );
};
