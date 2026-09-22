import { Injectable, signal } from '@angular/core';

export interface DetectedRegion {
  timezone: string;
  region: string | null;
  locale: string;
  suggestedUnits: 'METRIC' | 'IMPERIAL';
  label: string;
}

/** Countries that conventionally use imperial body-weight units. */
const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM']);

@Injectable({ providedIn: 'root' })
export class RegionService {
  private readonly detectedSignal = signal<DetectedRegion>(this.detectFromDevice());

  readonly detected = this.detectedSignal.asReadonly();

  /** Re-read timezone/region from the browser/OS. */
  refresh(): DetectedRegion {
    const next = this.detectFromDevice();
    this.detectedSignal.set(next);
    return next;
  }

  detectFromDevice(): DetectedRegion {
    const timezone = this.readTimezone();
    const locale = this.readLocale();
    const region = this.readRegion(locale, timezone);
    const suggestedUnits = region && IMPERIAL_REGIONS.has(region) ? 'IMPERIAL' : 'METRIC';
    const label = this.formatLabel(timezone, region);
    return { timezone, region, locale, suggestedUnits, label };
  }

  /**
   * Optional: ask for geolocation permission and refresh detection.
   * Timezone still comes from the device (most accurate for calendar dates);
   * region is refined from locale after permission is granted.
   */
  async detectWithPermission(): Promise<DetectedRegion> {
    try {
      if ('geolocation' in navigator) {
        await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 600_000
          });
        });
      }
    } catch {
      /* permission denied / unavailable — keep device locale/timezone */
    }
    return this.refresh();
  }

  private readTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }

  private readLocale(): string {
    return navigator.language || (navigator.languages && navigator.languages[0]) || 'en-US';
  }

  private readRegion(locale: string, timezone: string): string | null {
    try {
      const Loc = (Intl as unknown as { Locale?: new (tag: string) => { maximize: () => { region?: string } } }).Locale;
      if (Loc) {
        const maximized = new Loc(locale).maximize();
        if (maximized.region && /^[A-Za-z]{2}$/.test(maximized.region)) {
          return maximized.region.toUpperCase();
        }
      }
    } catch {
      /* fall through */
    }

    const match = /[-_]([A-Za-z]{2})$/.exec(locale);
    if (match) {
      return match[1].toUpperCase();
    }

    return this.regionFromTimezone(timezone);
  }

  private regionFromTimezone(timezone: string): string | null {
    const map: Record<string, string> = {
      'Asia/Kolkata': 'IN',
      'Asia/Calcutta': 'IN',
      'America/New_York': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Los_Angeles': 'US',
      'America/Phoenix': 'US',
      'Europe/London': 'GB',
      'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE',
      'Australia/Sydney': 'AU',
      'Asia/Tokyo': 'JP',
      'Asia/Singapore': 'SG',
      'Asia/Dubai': 'AE'
    };
    return map[timezone] ?? null;
  }

  private formatLabel(timezone: string, region: string | null): string {
    const city = timezone.includes('/')
      ? timezone.split('/').pop()!.replace(/_/g, ' ')
      : timezone;
    return region ? `${region} · ${city}` : city;
  }
}
