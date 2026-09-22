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
   * Re-detect from the device clock/timezone (most reliable for region).
   * GPS is intentionally not used — browser locale/GPS often disagree with
   * where the user actually is.
   */
  async detectWithPermission(): Promise<DetectedRegion> {
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
    // Prefer timezone — locale language packs (e.g. en-US) mislead often.
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
    // Soft match: America/* → US only for common US zones already listed;
    // Asia/Kolkata variants already covered.
    if (timezone.startsWith('America/')) {
      const usHints = ['New_York', 'Chicago', 'Denver', 'Los_Angeles', 'Phoenix', 'Detroit', 'Indiana'];
      if (usHints.some((h) => timezone.includes(h))) {
        return 'US';
      }
    }
    return null;
  }

  private formatLabel(timezone: string, region: string | null): string {
    const city = timezone.includes('/')
      ? timezone.split('/').pop()!.replace(/_/g, ' ')
      : timezone;
    return region ? `${region} · ${city}` : city;
  }
}
