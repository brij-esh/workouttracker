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

export function isAppApiUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) {
    return /\/api\b/i.test(url);
  }
  try {
    const { hostname, pathname } = new URL(url);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.trycloudflare.com') ||
      hostname.endsWith('.ngrok-free.app') ||
      hostname.endsWith('.ngrok.io') ||
      hostname.endsWith('.loca.lt') ||
      /workout-tracker|gateway/i.test(hostname) ||
      pathname.includes('/api')
    );
  } catch {
    return false;
  }
}
