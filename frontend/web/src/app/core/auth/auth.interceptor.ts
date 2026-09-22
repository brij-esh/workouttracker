import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { RegionService } from '../region.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const region = inject(RegionService);

  // Skip third-party requests (quote APIs, CDNs, etc.)
  if (/^https?:\/\//i.test(req.url) && !isAppApiUrl(req.url)) {
    return next(req);
  }

  const detected = region.detected();
  const regionHeaders: Record<string, string> = {
    'X-User-Timezone': detected.timezone
  };
  if (detected.region) {
    regionHeaders['X-User-Region'] = detected.region;
  }

  return from(auth.idToken()).pipe(
    switchMap((token) => {
      const headers: Record<string, string> = { ...regionHeaders };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      return next(req.clone({ setHeaders: headers }));
    })
  );
};

function isAppApiUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1|\/api\b|workout-tracker|gateway/i.test(url);
}
