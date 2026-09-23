import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, firstValueFrom, from, of, switchMap, throwError } from 'rxjs';
import { OFFLINE_REPLAY_HEADER, OfflineOutboxService } from './offline-outbox.service';
import { isAppApiUrl } from './auth/auth.interceptor';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * On transport / 5xx failures for mutating API calls:
 * 1. Retry once if the gateway health probe says the server is up (transient glitch).
 * 2. Only enqueue to the offline outbox when the server is confirmed unreachable.
 * Prevents Android status-0 / flaky navigator.onLine from falsely marking the app offline.
 */
export const offlineInterceptor: HttpInterceptorFn = (req, next) => {
  const outbox = inject(OfflineOutboxService);

  if (req.headers.has(OFFLINE_REPLAY_HEADER)) {
    return next(req);
  }

  if (!isAppApiUrl(req.url) || /\/actuator\/health\b/i.test(req.url)) {
    return next(req);
  }

  const method = req.method.toUpperCase();
  if (!MUTATING.has(method)) {
    return next(req);
  }

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!shouldQueue(err)) {
        return throwError(() => err);
      }

      return from(
        (async () => {
          const reachable = await outbox.isServerReachable(true);
          if (reachable) {
            try {
              return await firstValueFrom(next(req));
            } catch (retryErr) {
              throw retryErr ?? err;
            }
          }

          const entry = await outbox.enqueueFromRequest(req);
          return new HttpResponse({
            status: 202,
            statusText: 'Accepted Offline',
            body: outbox.optimisticBody(req, entry),
            url: req.url
          });
        })()
      ).pipe(
        switchMap((res) => of(res)),
        catchError((e) => throwError(() => e))
      );
    })
  );
};

function shouldQueue(err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse)) {
    return true;
  }
  if (err.status === 0) {
    return true;
  }
  return err.status >= 500;
}
