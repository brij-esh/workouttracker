import { Injectable, signal } from '@angular/core';

export type RegionDetectSource = 'timezone' | 'location';

export interface DetectedRegion {
  timezone: string;
  region: string | null;
  locale: string;
  suggestedUnits: 'METRIC' | 'IMPERIAL';
  label: string;
  source: RegionDetectSource;
}

/** Countries that conventionally use imperial body-weight units. */
const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM']);

/**
 * Timezone → ISO country. Prefer this over browser locale, which is often
 * wrong when the OS language is en-US but the user lives elsewhere.
 */
const TIMEZONE_REGION: Record<string, string> = {
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Dhaka': 'BD',
  'Asia/Karachi': 'PK',
  'Asia/Kathmandu': 'NP',
  'Asia/Colombo': 'LK',
  'Asia/Dubai': 'AE',
  'Asia/Qatar': 'QA',
  'Asia/Riyadh': 'SA',
  'Asia/Singapore': 'SG',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Jakarta': 'ID',
  'Asia/Bangkok': 'TH',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Manila': 'PH',
  'Asia/Hong_Kong': 'HK',
  'Asia/Shanghai': 'CN',
  'Asia/Taipei': 'TW',
  'Asia/Seoul': 'KR',
  'Asia/Tokyo': 'JP',
  'Asia/Jerusalem': 'IL',
  'Asia/Tehran': 'IR',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Zurich': 'CH',
  'Europe/Vienna': 'AT',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI',
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Budapest': 'HU',
  'Europe/Bucharest': 'RO',
  'Europe/Athens': 'GR',
  'Europe/Lisbon': 'PT',
  'Europe/Moscow': 'RU',
  'Europe/Istanbul': 'TR',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'America/Honolulu': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Halifax': 'CA',
  'America/Mexico_City': 'MX',
  'America/Sao_Paulo': 'BR',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Bogota': 'CO',
  'America/Lima': 'PE',
  'America/Santiago': 'CL',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Adelaide': 'AU',
  'Pacific/Auckland': 'NZ',
  'Africa/Johannesburg': 'ZA',
  'Africa/Cairo': 'EG',
  'Africa/Lagos': 'NG',
  'Africa/Nairobi': 'KE'
};

@Injectable({ providedIn: 'root' })
export class RegionService {
  private readonly detectedSignal = signal<DetectedRegion>(this.detectFromTimezone());

  readonly detected = this.detectedSignal.asReadonly();

  /** Re-read timezone/region from the browser/OS clock. */
  refresh(): DetectedRegion {
    return this.apply(this.detectFromTimezone());
  }

  detectFromTimezone(): DetectedRegion {
    const timezone = this.readTimezone();
    const locale = this.readLocale();
    const region = this.readRegionFromTimezone(locale, timezone);
    const suggestedUnits = region && IMPERIAL_REGIONS.has(region) ? 'IMPERIAL' : 'METRIC';
    const label = this.formatLabel(timezone, region, 'timezone');
    return { timezone, region, locale, suggestedUnits, label, source: 'timezone' };
  }

  /**
   * Ask for GPS, reverse-geocode to a country code, keep device timezone.
   * Falls back to timezone detection if permission is denied or lookup fails.
   */
  async detectFromLocation(): Promise<DetectedRegion> {
    const position = await this.readPosition();
    const geo = await this.reverseGeocode(position.coords.latitude, position.coords.longitude);
    const timezone = this.readTimezone();
    const locale = this.readLocale();
    const region = geo.region ?? this.readRegionFromTimezone(locale, timezone);
    const suggestedUnits = region && IMPERIAL_REGIONS.has(region) ? 'IMPERIAL' : 'METRIC';
    const place = geo.place || (timezone.includes('/') ? timezone.split('/').pop()!.replace(/_/g, ' ') : timezone);
    const label = region ? `${region} · ${place} (location)` : `${place} (location)`;
    return this.apply({
      timezone,
      region,
      locale,
      suggestedUnits,
      label,
      source: 'location'
    });
  }

  /** @deprecated Prefer detectFromTimezone / detectFromLocation. */
  async detectWithPermission(): Promise<DetectedRegion> {
    return this.refresh();
  }

  private apply(next: DetectedRegion): DetectedRegion {
    this.detectedSignal.set(next);
    return next;
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

  private readRegionFromTimezone(locale: string, timezone: string): string | null {
    const fromTz = this.regionFromTimezone(timezone);
    if (fromTz) {
      return fromTz;
    }

    try {
      const Loc = (Intl as unknown as { Locale?: new (tag: string) => { maximize: () => { region?: string } } })
        .Locale;
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

    return null;
  }

  private regionFromTimezone(timezone: string): string | null {
    if (TIMEZONE_REGION[timezone]) {
      return TIMEZONE_REGION[timezone];
    }
    if (timezone.startsWith('America/')) {
      const usHints = ['New_York', 'Chicago', 'Denver', 'Los_Angeles', 'Phoenix', 'Detroit', 'Indiana'];
      if (usHints.some((h) => timezone.includes(h))) {
        return 'US';
      }
    }
    return null;
  }

  private readPosition(): Promise<GeolocationPosition> {
    if (!navigator.geolocation) {
      return Promise.reject(new Error('Location is not available on this device'));
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Location permission denied'));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('Location timed out — try again'));
        } else {
          reject(new Error('Could not read location'));
        }
      }, {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 5 * 60 * 1000
      });
    });
  }

  private async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<{ region: string | null; place: string | null }> {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${encodeURIComponent(String(latitude))}` +
      `&longitude=${encodeURIComponent(String(longitude))}` +
      `&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Could not resolve location to a region');
    }
    const data = (await res.json()) as {
      countryCode?: string;
      city?: string;
      locality?: string;
      principalSubdivision?: string;
    };
    const region =
      data.countryCode && /^[A-Za-z]{2}$/.test(data.countryCode)
        ? data.countryCode.toUpperCase()
        : null;
    const place = data.city || data.locality || data.principalSubdivision || null;
    return { region, place };
  }

  private formatLabel(timezone: string, region: string | null, source: RegionDetectSource): string {
    const city = timezone.includes('/')
      ? timezone.split('/').pop()!.replace(/_/g, ' ')
      : timezone;
    const base = region ? `${region} · ${city}` : city;
    return source === 'location' ? `${base} (location)` : `${base} (timezone)`;
  }
}
