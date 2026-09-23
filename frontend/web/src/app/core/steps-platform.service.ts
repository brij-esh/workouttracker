import { Injectable, signal } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { StepSource } from './models';

export type StepsPermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported';

export interface StepsCapability {
  deviceSupported: boolean;
  wearableSupported: boolean;
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

const AUTH_TIMEOUT_MS = 45_000;
const QUICK_TIMEOUT_MS = 8_000;

interface RepwiseStepsPlugin {
  isAvailable(): Promise<{ available: boolean; reason?: string }>;
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  getTodaySteps(): Promise<{ steps: number; dayKey: string; sourceLabel?: string }>;
}

const RepwiseSteps = registerPlugin<RepwiseStepsPlugin>('RepwiseSteps');

/**
 * Phone steps: native TYPE_STEP_COUNTER (RepwiseSteps) — works without Health Connect.
 * Wearable steps: Health Connect aggregate (watch/band data synced by the OS).
 */
@Injectable({ providedIn: 'root' })
export class StepsPlatformService {
  readonly devicePermission = signal<StepsPermissionState>(this.readPerm(DEVICE_PERM_KEY));
  readonly wearablePermission = signal<StepsPermissionState>(this.readPerm(WEARABLE_PERM_KEY));
  readonly deviceSyncEnabled = signal(this.readFlag(DEVICE_ENABLED_KEY));
  readonly wearableSyncEnabled = signal(this.readFlag(WEARABLE_ENABLED_KEY));

  private healthAvailCache: { at: number; available: boolean; reason: string } | null = null;

  capability(): StepsCapability {
    if (!Capacitor.isNativePlatform()) {
      return {
        deviceSupported: false,
        wearableSupported: false,
        nativeBridge: false,
        reason:
          'Safari and Chrome cannot read phone sensors / Health Connect. Use the Android app, or add steps manually on Home.'
      };
    }
    const android = Capacitor.getPlatform() === 'android';
    return {
      deviceSupported: android,
      wearableSupported: android,
      nativeBridge: true,
      reason: android
        ? 'Phone pedometer + Health Connect for wearables'
        : 'Native health bridge'
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
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return this.setDevicePerm('unsupported');
    }
    try {
      const avail = await withTimeout(RepwiseSteps.isAvailable(), QUICK_TIMEOUT_MS, null);
      if (!avail?.available) {
        // Fall back to Health Connect for phone totals.
        return this.requestHealthPermission('DEVICE');
      }
      const result = await withTimeout(
        RepwiseSteps.requestPermission(),
        AUTH_TIMEOUT_MS,
        { granted: false }
      );
      const state: StepsPermissionState = result?.granted ? 'granted' : 'denied';
      return this.setDevicePerm(state);
    } catch {
      return this.setDevicePerm('denied');
    }
  }

  async requestWearablePermission(): Promise<StepsPermissionState> {
    return this.requestHealthPermission('WEARABLE');
  }

  async readTodaySteps(preferred: 'DEVICE' | 'WEARABLE' = 'DEVICE'): Promise<StepsSample | null> {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }
    const enabled =
      preferred === 'WEARABLE' ? this.wearableSyncEnabled() : this.deviceSyncEnabled();
    if (!enabled) {
      return null;
    }

    if (preferred === 'DEVICE') {
      const phone = await this.readPhoneSensorSteps();
      if (phone) {
        return phone;
      }
      // Optional HC fallback if sensor unavailable.
      return this.readHealthConnectSteps('DEVICE');
    }

    return this.readHealthConnectSteps('WEARABLE');
  }

  async readPreferredTodaySteps(): Promise<StepsSample | null> {
    const wearable = this.wearableSyncEnabled()
      ? await this.readTodaySteps('WEARABLE')
      : null;
    const phone = this.deviceSyncEnabled() ? await this.readTodaySteps('DEVICE') : null;

    if (wearable && phone) {
      // Use the higher total so we never under-count.
      return wearable.steps >= phone.steps ? wearable : phone;
    }
    return wearable ?? phone;
  }

  openHealthSettings(): void {
    void (async () => {
      try {
        const Health = await this.loadHealth();
        await withTimeout(Health?.openHealthConnectSettings?.() ?? Promise.resolve(), 5_000, undefined);
      } catch {
        /* ignore — never block UI */
      }
    })();
  }

  private async readPhoneSensorSteps(): Promise<StepsSample | null> {
    if (this.devicePermission() === 'denied' || this.devicePermission() === 'unsupported') {
      return null;
    }
    try {
      const result = await withTimeout(RepwiseSteps.getTodaySteps(), QUICK_TIMEOUT_MS, null);
      if (!result) {
        return null;
      }
      return {
        steps: Math.max(0, Math.round(Number(result.steps) || 0)),
        source: 'DEVICE',
        sourceLabel: result.sourceLabel || 'Phone',
        recordedOn: result.dayKey || this.todayKey()
      };
    } catch {
      return null;
    }
  }

  private async readHealthConnectSteps(
    preferred: 'DEVICE' | 'WEARABLE'
  ): Promise<StepsSample | null> {
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
      const avail = await this.ensureHealthAvailable(Health);
      if (!avail.available) {
        return null;
      }

      const { startIso, endIso, dayKey } = this.todayRange();
      let total = 0;

      if (Health.queryAggregated) {
        const { samples } = await withTimeout(
          Health.queryAggregated({
            dataType: 'steps',
            startDate: startIso,
            endDate: endIso,
            bucket: 'day',
            aggregation: 'sum'
          }),
          QUICK_TIMEOUT_MS,
          { samples: [] }
        );
        total = (samples ?? []).reduce((sum, s) => sum + num(s.value), 0);
      } else {
        const { samples } = await withTimeout(
          Health.readSamples({
            dataType: 'steps',
            startDate: startIso,
            endDate: endIso,
            limit: 5000
          }),
          QUICK_TIMEOUT_MS,
          { samples: [] }
        );
        const wearableTypes = new Set(['watch', 'fitnessBand', 'ring', 'chestStrap']);
        const list = samples ?? [];
        if (preferred === 'WEARABLE') {
          const wearableOnly = list.filter(
            (s) => s.deviceType && wearableTypes.has(s.deviceType)
          );
          const pool = wearableOnly.length ? wearableOnly : list;
          total = pool.reduce((sum, s) => sum + num(s.value), 0);
        } else {
          total = list.reduce((sum, s) => sum + num(s.value), 0);
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

  private async requestHealthPermission(
    kind: 'DEVICE' | 'WEARABLE'
  ): Promise<StepsPermissionState> {
    const setState = (state: StepsPermissionState) =>
      kind === 'WEARABLE' ? this.setWearablePerm(state) : this.setDevicePerm(state);

    if (!Capacitor.isNativePlatform()) {
      return setState('unsupported');
    }

    try {
      const Health = await this.loadHealth();
      if (!Health) {
        return setState('unsupported');
      }
      const avail = await this.ensureHealthAvailable(Health);
      if (!avail.available) {
        this.openHealthSettings();
        return setState('unsupported');
      }

      // Launch permission UI with a hard timeout so toggles never stay disabled forever.
      const status = await withTimeout(
        Health.requestAuthorization({ read: ['steps'], write: [] }),
        AUTH_TIMEOUT_MS,
        null
      );

      if (status == null) {
        // Timed out while sheet was open — re-check; user may have granted.
        const check = await withTimeout(
          Health.checkAuthorization?.({ read: ['steps'], write: [] }) ?? Promise.resolve(null),
          QUICK_TIMEOUT_MS,
          null
        );
        return setState(isStepsAuthorized(check) ? 'granted' : 'denied');
      }

      const check =
        (await withTimeout(
          Health.checkAuthorization?.({ read: ['steps'], write: [] }) ?? Promise.resolve(status),
          QUICK_TIMEOUT_MS,
          status
        )) ?? status;

      return setState(isStepsAuthorized(check) ? 'granted' : 'denied');
    } catch {
      return setState('denied');
    }
  }

  private async ensureHealthAvailable(
    Health: HealthPlugin
  ): Promise<{ available: boolean; reason: string }> {
    const now = Date.now();
    if (this.healthAvailCache && now - this.healthAvailCache.at < 30_000) {
      return this.healthAvailCache;
    }
    try {
      const result = await withTimeout(Health.isAvailable(), QUICK_TIMEOUT_MS, {
        available: false,
        reason: 'Health Connect check timed out'
      });
      const available = !!result?.available;
      const reason = result?.reason || (available ? 'ok' : 'Health Connect unavailable');
      this.healthAvailCache = { at: now, available, reason };
      return this.healthAvailCache;
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Health check failed';
      this.healthAvailCache = { at: now, available: false, reason };
      return this.healthAvailCache;
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

  private setDevicePerm(state: StepsPermissionState): StepsPermissionState {
    this.setPerm(DEVICE_PERM_KEY, state);
    this.devicePermission.set(state);
    return state;
  }

  private setWearablePerm(state: StepsPermissionState): StepsPermissionState {
    this.setPerm(WEARABLE_PERM_KEY, state);
    this.wearablePermission.set(state);
    return state;
  }

  private todayRange(): { startIso: string; endIso: string; dayKey: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      dayKey: this.todayKey()
    };
  }

  private todayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
}

function isStepsAuthorized(status: AuthorizationStatus | null | undefined): boolean {
  if (!status) {
    return false;
  }
  if (Array.isArray(status.readDenied) && status.readDenied.includes('steps')) {
    return false;
  }
  if (Array.isArray(status.readAuthorized)) {
    return status.readAuthorized.includes('steps');
  }
  return false;
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(fallback);
      }
    }, ms);
    promise
      .then((value) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(value);
        }
      })
      .catch(() => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}
