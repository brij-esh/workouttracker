import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, of, switchMap, throwError } from 'rxjs';
import { OFFLINE_REPLAY_HEADER, OfflineOutboxService } from './offline-outbox.service';
import { isAppApiUrl } from './auth/auth.interceptor';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

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
      return from(outbox.enqueueFromRequest(req)).pipe(
        switchMap((entry) =>
          of(
            new HttpResponse({
              status: 202,
              statusText: 'Accepted Offline',
              body: outbox.optimisticBody(req, entry),
              url: req.url
            })
          )
        )
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
