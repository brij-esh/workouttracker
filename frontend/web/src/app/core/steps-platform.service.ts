import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StepSource } from './models';

export type StepsPermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported';

export interface StepsCapability {
  deviceSupported: boolean;
  wearableSupported: boolean;
  /** True when Health Connect / HealthKit bridge is usable. */
  nativeBridge: boolean;
  reason: string;
}

export interface StepsSample {
  steps: number;
  source: StepSource;
  sourceLabel: string;
  recordedOn: string;
}

const DEVICE_PERM_KEY = 'repwise.steps.devicePermission';
const WEARABLE_PERM_KEY = 'repwise.steps.wearablePermission';
const DEVICE_ENABLED_KEY = 'repwise.steps.deviceEnabled';
const WEARABLE_ENABLED_KEY = 'repwise.steps.wearableEnabled';

/**
 * Phone + wearable steps via Health Connect (Android) / HealthKit (iOS).
 * On web browsers there is no pedometer API — toggles store intent only.
 */
@Injectable({ providedIn: 'root' })
export class StepsPlatformService {
  readonly devicePermission = signal<StepsPermissionState>(this.readPerm(DEVICE_PERM_KEY));
  readonly wearablePermission = signal<StepsPermissionState>(this.readPerm(WEARABLE_PERM_KEY));
  readonly deviceSyncEnabled = signal(this.readFlag(DEVICE_ENABLED_KEY));
  readonly wearableSyncEnabled = signal(this.readFlag(WEARABLE_ENABLED_KEY));

  private availabilityCache: { at: number; available: boolean; reason: string } | null = null;

  capability(): StepsCapability {
    if (!Capacitor.isNativePlatform()) {
      return {
        deviceSupported: false,
        wearableSupported: false,
        nativeBridge: false,
        reason:
          'Safari and Chrome cannot read HealthKit / Health Connect. Use the Android app for phone and wearable sync, or add steps manually on Home.'
      };
    }
    return {
      deviceSupported: true,
      wearableSupported: true,
      nativeBridge: true,
      reason: 'Native health bridge (Health Connect / HealthKit)'
    };
  }

  async setDeviceSyncEnabled(enabled: boolean): Promise<StepsPermissionState | 'off'> {
    if (!enabled) {
      localStorage.removeItem(DEVICE_ENABLED_KEY);
      this.deviceSyncEnabled.set(false);
      return 'off';
    }
    const state = await this.requestDevicePermission();
    if (state === 'granted') {
      localStorage.setItem(DEVICE_ENABLED_KEY, '1');
      this.deviceSyncEnabled.set(true);
    }
    return state;
  }

  async setWearableSyncEnabled(enabled: boolean): Promise<StepsPermissionState | 'off'> {
    if (!enabled) {
      localStorage.removeItem(WEARABLE_ENABLED_KEY);
      this.wearableSyncEnabled.set(false);
      return 'off';
    }
    const state = await this.requestWearablePermission();
    if (state === 'granted') {
      localStorage.setItem(WEARABLE_ENABLED_KEY, '1');
      this.wearableSyncEnabled.set(true);
    }
    return state;
  }

  async requestDevicePermission(): Promise<StepsPermissionState> {
    return this.requestHealthPermission('DEVICE');
  }

  async requestWearablePermission(): Promise<StepsPermissionState> {
    return this.requestHealthPermission('WEARABLE');
  }

  /**
   * Read today's step total from Health Connect / HealthKit.
   * Wearables that sync to Health Connect are included in the same pool;
   * when preferred is WEARABLE we prefer samples tagged as watch/band/ring.
   */
  async readTodaySteps(preferred: 'DEVICE' | 'WEARABLE' = 'DEVICE'): Promise<StepsSample | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }
    const enabled =
      preferred === 'WEARABLE' ? this.wearableSyncEnabled() : this.deviceSyncEnabled();
    if (!enabled) {
      return null;
    }
    const perm =
      preferred === 'WEARABLE' ? this.wearablePermission() : this.devicePermission();
    if (perm === 'denied' || perm === 'unsupported') {
      return null;
    }

    try {
      const Health = await this.loadHealth();
      if (!Health) {
        return null;
      }
      const avail = await this.ensureAvailable(Health);
      if (!avail.available) {
        return null;
      }

      const { startIso, endIso, dayKey } = this.todayRange();
      let total = 0;

      if (Health.queryAggregated) {
        const { samples } = await Health.queryAggregated({
          dataType: 'steps',
          startDate: startIso,
          endDate: endIso,
          bucket: 'day',
          aggregation: 'sum'
        });
        total = (samples ?? []).reduce((sum, s) => {
          const v = typeof s.value === 'number' ? s.value : Number(s.value);
          return sum + (Number.isFinite(v) ? v : 0);
        }, 0);
      } else {
        const { samples } = await Health.readSamples({
          dataType: 'steps',
          startDate: startIso,
          endDate: endIso,
          limit: 5000
        });
        const wearableTypes = new Set(['watch', 'fitnessBand', 'ring', 'chestStrap']);
        const filtered = (samples ?? []).filter((s) => {
          if (!s.deviceType) {
            return true; // unknown origin — include in both pools
          }
          const isWearable = wearableTypes.has(s.deviceType);
          return preferred === 'WEARABLE' ? isWearable : !isWearable;
        });
        total = filtered.reduce((sum, s) => {
          const v = typeof s.value === 'number' ? s.value : Number(s.value);
          return sum + (Number.isFinite(v) ? v : 0);
        }, 0);
        // Wearable preferred but no watch-tagged samples — fall back to full total.
        if (preferred === 'WEARABLE' && total <= 0 && (samples?.length ?? 0) > 0) {
          total = samples!.reduce((sum, s) => {
            const v = typeof s.value === 'number' ? s.value : Number(s.value);
            return sum + (Number.isFinite(v) ? v : 0);
          }, 0);
        }
      }

      return {
        steps: Math.max(0, Math.round(total)),
        source: preferred,
        sourceLabel:
          preferred === 'WEARABLE' ? 'Wearable · Health Connect' : 'Phone · Health Connect',
        recordedOn: dayKey
      };
    } catch {
      return null;
    }
  }

  /** Prefer wearable when both enabled; otherwise phone. */
  async readPreferredTodaySteps(): Promise<StepsSample | null> {
    if (this.wearableSyncEnabled()) {
      const w = await this.readTodaySteps('WEARABLE');
      if (w && w.steps > 0) {
        return w;
      }
    }
    if (this.deviceSyncEnabled()) {
      return this.readTodaySteps('DEVICE');
    }
    if (this.wearableSyncEnabled()) {
      return this.readTodaySteps('WEARABLE');
    }
    return null;
  }

  async openHealthSettings(): Promise<void> {
    try {
      const Health = await this.loadHealth();
      if (!Health?.openHealthConnectSettings) {
        return;
      }
      await Health.openHealthConnectSettings();
    } catch {
      /* ignore */
    }
  }

  private async requestHealthPermission(
    kind: 'DEVICE' | 'WEARABLE'
  ): Promise<StepsPermissionState> {
    const permKey = kind === 'WEARABLE' ? WEARABLE_PERM_KEY : DEVICE_PERM_KEY;
    const setState = (state: StepsPermissionState) => {
      this.setPerm(permKey, state);
      if (kind === 'WEARABLE') {
        this.wearablePermission.set(state);
      } else {
        this.devicePermission.set(state);
      }
      return state;
    };

    if (!Capacitor.isNativePlatform()) {
      return setState('unsupported');
    }

    try {
      const Health = await this.loadHealth();
      if (!Health) {
        return setState('unsupported');
      }
      const avail = await this.ensureAvailable(Health);
      if (!avail.available) {
        // Prompt install / settings when Health Connect is missing.
        try {
          await Health.openHealthConnectSettings?.();
        } catch {
          /* ignore */
        }
        return setState('unsupported');
      }

      const status = (await Health.requestAuthorization({
        read: ['steps'],
        write: []
      })) as AuthorizationStatus | undefined;

      const check =
        (await Health.checkAuthorization?.({
          read: ['steps'],
          write: []
        })) ?? status;

      const granted = isStepsAuthorized(check);
      return setState(granted ? 'granted' : 'denied');
    } catch {
      return setState('denied');
    }
  }

  private async ensureAvailable(
    Health: HealthPlugin
  ): Promise<{ available: boolean; reason: string }> {
    const now = Date.now();
    if (this.availabilityCache && now - this.availabilityCache.at < 60_000) {
      return this.availabilityCache;
    }
    try {
      const result = await Health.isAvailable();
      const available = !!result?.available;
      const reason = result?.reason || (available ? 'ok' : 'Health Connect unavailable');
      this.availabilityCache = { at: now, available, reason };
      return this.availabilityCache;
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Health check failed';
      this.availabilityCache = { at: now, available: false, reason };
      return this.availabilityCache;
    }
  }

  private async loadHealth(): Promise<HealthPlugin | null> {
    try {
      const mod = await import('@capgo/capacitor-health');
      return (mod.Health ?? null) as HealthPlugin | null;
    } catch {
      return null;
    }
  }

  private todayRange(): { startIso: string; endIso: string; dayKey: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const dayKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    return { startIso: start.toISOString(), endIso: end.toISOString(), dayKey };
  }

  private readFlag(key: string): boolean {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  }

  private readPerm(key: string): StepsPermissionState {
    try {
      const raw = localStorage.getItem(key);
      if (raw === 'granted' || raw === 'denied' || raw === 'unsupported') {
        return raw;
      }
    } catch {
      /* ignore */
    }
    return 'unknown';
  }

  private setPerm(key: string, state: StepsPermissionState): void {
    try {
      localStorage.setItem(key, state);
    } catch {
      /* ignore */
    }
  }
}

/** Minimal surface of @capgo/capacitor-health used by Repwise. */
interface HealthPlugin {
  isAvailable(): Promise<{ available: boolean; reason?: string }>;
  requestAuthorization(opts: { read: string[]; write: string[] }): Promise<AuthorizationStatus>;
  checkAuthorization?(opts: {
    read: string[];
    write: string[];
  }): Promise<AuthorizationStatus>;
  readSamples(opts: {
    dataType: string;
    startDate: string;
    endDate: string;
    limit?: number;
  }): Promise<{ samples: Array<{ value: number; deviceType?: string }> }>;
  queryAggregated?(opts: {
    dataType: string;
    startDate: string;
    endDate: string;
    bucket: string;
    aggregation: string;
  }): Promise<{ samples: Array<{ value: number }> }>;
  openHealthConnectSettings?(): Promise<void>;
}

interface AuthorizationStatus {
  readAuthorized?: string[];
  readDenied?: string[];
  writeAuthorized?: string[];
  writeDenied?: string[];
}

function isStepsAuthorized(status: AuthorizationStatus | null | undefined): boolean {
  if (!status) {
    return true;
  }
  if (Array.isArray(status.readDenied) && status.readDenied.includes('steps')) {
    return false;
  }
  if (Array.isArray(status.readAuthorized)) {
    return status.readAuthorized.includes('steps');
  }
  return true;
}
