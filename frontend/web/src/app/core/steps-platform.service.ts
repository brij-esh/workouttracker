import { Injectable, signal } from '@angular/core';
import { StepSource } from './models';

export type StepsPermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported';

export interface StepsCapability {
  deviceSupported: boolean;
  wearableSupported: boolean;
  /** True when a native Capacitor Health plugin bridge is present. */
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
 * Reads / requests step access. Browsers cannot reach HealthKit or Health Connect;
 * a Capacitor (or similar) native bridge can. Until then we support consent toggles
 * and keep hooks for device/wearable sync.
 */
@Injectable({ providedIn: 'root' })
export class StepsPlatformService {
  readonly devicePermission = signal<StepsPermissionState>(this.readPerm(DEVICE_PERM_KEY));
  readonly wearablePermission = signal<StepsPermissionState>(this.readPerm(WEARABLE_PERM_KEY));
  readonly deviceSyncEnabled = signal(localStorage.getItem(DEVICE_ENABLED_KEY) === '1');
  readonly wearableSyncEnabled = signal(localStorage.getItem(WEARABLE_ENABLED_KEY) === '1');

  capability(): StepsCapability {
    const nativeBridge = this.hasNativeHealthBridge();
    if (nativeBridge) {
      return {
        deviceSupported: true,
        wearableSupported: true,
        nativeBridge: true,
        reason: 'Native health bridge detected'
      };
    }
    return {
      deviceSupported: false,
      wearableSupported: false,
      nativeBridge: false,
      reason:
        'Safari and Chrome cannot read HealthKit / Health Connect. Enable sync here for when a native wrapper is available; add steps manually on Home.'
    };
  }

  async setDeviceSyncEnabled(enabled: boolean): Promise<StepsPermissionState | 'off'> {
    if (!enabled) {
      localStorage.removeItem(DEVICE_ENABLED_KEY);
      this.deviceSyncEnabled.set(false);
      return 'off';
    }
    const state = await this.requestDevicePermission();
    if (state === 'granted' || state === 'unsupported') {
      // Persist intent even when browser can't sync yet.
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
    if (state === 'granted' || state === 'unsupported') {
      localStorage.setItem(WEARABLE_ENABLED_KEY, '1');
      this.wearableSyncEnabled.set(true);
    }
    return state;
  }

  async requestDevicePermission(): Promise<StepsPermissionState> {
    const cap = this.capability();
    if (!cap.deviceSupported) {
      this.setPerm(DEVICE_PERM_KEY, 'unsupported');
      this.devicePermission.set('unsupported');
      return 'unsupported';
    }
    try {
      const bridge = this.nativeBridge();
      if (bridge?.requestPermissions) {
        const ok = await bridge.requestPermissions(['steps']);
        const state: StepsPermissionState = ok ? 'granted' : 'denied';
        this.setPerm(DEVICE_PERM_KEY, state);
        this.devicePermission.set(state);
        return state;
      }
    } catch {
      this.setPerm(DEVICE_PERM_KEY, 'denied');
      this.devicePermission.set('denied');
      return 'denied';
    }
    this.setPerm(DEVICE_PERM_KEY, 'unsupported');
    this.devicePermission.set('unsupported');
    return 'unsupported';
  }

  async requestWearablePermission(): Promise<StepsPermissionState> {
    const cap = this.capability();
    if (!cap.wearableSupported && !cap.nativeBridge) {
      this.setPerm(WEARABLE_PERM_KEY, 'granted');
      this.wearablePermission.set('granted');
      return 'granted';
    }
    try {
      const bridge = this.nativeBridge();
      if (bridge?.requestPermissions) {
        const ok = await bridge.requestPermissions(['steps', 'wearable']);
        const state: StepsPermissionState = ok ? 'granted' : 'denied';
        this.setPerm(WEARABLE_PERM_KEY, state);
        this.wearablePermission.set(state);
        return state;
      }
    } catch {
      this.setPerm(WEARABLE_PERM_KEY, 'denied');
      this.wearablePermission.set('denied');
      return 'denied';
    }
    this.setPerm(WEARABLE_PERM_KEY, 'granted');
    this.wearablePermission.set('granted');
    return 'granted';
  }

  async readTodaySteps(preferred: 'DEVICE' | 'WEARABLE' = 'DEVICE'): Promise<StepsSample | null> {
    const bridge = this.nativeBridge();
    if (!bridge?.querySteps) {
      return null;
    }
    const today = new Date().toISOString().slice(0, 10);
    const result = await bridge.querySteps({ from: today, to: today });
    if (!result || typeof result.steps !== 'number') {
      return null;
    }
    return {
      steps: Math.max(0, Math.round(result.steps)),
      source: preferred,
      sourceLabel: result.sourceLabel || (preferred === 'WEARABLE' ? 'Wearable' : 'Phone'),
      recordedOn: today
    };
  }

  private hasNativeHealthBridge(): boolean {
    return !!this.nativeBridge();
  }

  private nativeBridge(): NativeHealthBridge | null {
    const w = window as Window & { RepwiseHealth?: NativeHealthBridge; Capacitor?: unknown };
    if (w.RepwiseHealth?.querySteps || w.RepwiseHealth?.requestPermissions) {
      return w.RepwiseHealth;
    }
    return null;
  }

  private readPerm(key: string): StepsPermissionState {
    const raw = localStorage.getItem(key);
    if (raw === 'granted' || raw === 'denied' || raw === 'unsupported') {
      return raw;
    }
    return 'unknown';
  }

  private setPerm(key: string, state: StepsPermissionState): void {
    localStorage.setItem(key, state);
  }
}

interface NativeHealthBridge {
  requestPermissions?(scopes: string[]): Promise<boolean>;
  querySteps?(range: { from: string; to: string }): Promise<{ steps: number; sourceLabel?: string } | null>;
}
