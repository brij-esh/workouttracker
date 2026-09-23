import { Injectable, NgZone, effect, inject, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ActiveWorkoutSession, ActiveWorkoutSessionService } from './active-workout-session.service';
import { APP_BRAND } from './app-brand';

const NOTIF_TAG = 'wt.active-workout';
const SW_URL = '/sw.js';
/** Stable Android local-notification id (32-bit). */
const NATIVE_NOTIF_ID = 71001;
const ANDROID_CHANNEL_ID = 'workout-live';

/**
 * Lock-screen / notification-shade workout presence:
 * - Android native: Capacitor LocalNotifications (ongoing, live timer in shade).
 * - Web/desktop: Media Session + quiet tagged Notification (no banner spam).
 * - iPhone: Media Session only (Apple treats notification replaces as new alerts).
 */
@Injectable({ providedIn: 'root' })
export class WorkoutOsNotificationService {
  private readonly session = inject(ActiveWorkoutSessionService);
  private readonly zone = inject(NgZone);

  private lastPaused: boolean | null = null;
  private lastWorkoutId: string | null = null;
  private lastNotifKey = '';
  private baseTitle: string = APP_BRAND.name;
  private swReg: ServiceWorkerRegistration | null = null;
  private swReady: Promise<ServiceWorkerRegistration | null> | null = null;
  private androidChannelReady: Promise<void> | null = null;
  private nativePermGranted: boolean | null = null;

  private mediaTick: ReturnType<typeof setInterval> | null = null;
  private notifTick: ReturnType<typeof setInterval> | null = null;
  /** Serialize Android schedule() calls so ticks never pile up. */
  private androidPostChain: Promise<void> = Promise.resolve();
  private lastAndroidPostAt = 0;
  private audioCtx: AudioContext | null = null;
  private audioGain: GainNode | null = null;
  private audioOsc: OscillatorNode | null = null;
  private readonly isIos = this.detectIos();
  private readonly isNativeAndroid =
    Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  /** Android: refresh shade timer slowly — scheduling every second spams the shade. */
  private readonly notifTickMs = this.isNativeAndroid ? 30_000 : 1_000;

  constructor() {
    if (typeof document !== 'undefined') {
      this.baseTitle = document.title || APP_BRAND.name;
    }
    if (!this.isNativeAndroid) {
      void this.ensureServiceWorker();
    }

    effect(() => {
      const active = this.session.active();
      const paused = this.session.isPaused();
      // Never read display() here — that re-runs every second and spam-posts.
      untracked(() => this.sync(active, paused));
    });
  }

  /** Prefer calling from a user gesture (starting a workout). */
  async ensurePermission(): Promise<NotificationPermission | 'unsupported'> {
    if (this.isIos) {
      return 'unsupported';
    }
    if (this.isNativeAndroid) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await this.ensureAndroidChannel(LocalNotifications);
        const current = await LocalNotifications.checkPermissions();
        if (current.display === 'granted') {
          this.nativePermGranted = true;
          return 'granted';
        }
        const requested = await LocalNotifications.requestPermissions();
        this.nativePermGranted = requested.display === 'granted';
        return this.nativePermGranted ? 'granted' : 'denied';
      } catch {
        this.nativePermGranted = false;
        return 'denied';
      }
    }
    if (typeof Notification === 'undefined') {
      return 'unsupported';
    }
    await this.ensureServiceWorker();
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return Notification.permission;
    }
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }

  private sync(active: ActiveWorkoutSession | null, paused: boolean): void {
    if (!active) {
      this.teardown();
      return;
    }

    const statusChanged = this.lastPaused !== paused;
    const workoutChanged = this.lastWorkoutId !== active.workoutId;
    this.lastPaused = paused;
    this.lastWorkoutId = active.workoutId;

    if (statusChanged || workoutChanged) {
      if (typeof document !== 'undefined') {
        document.title = paused
          ? `${APP_BRAND.name} · Paused`
          : `${APP_BRAND.name} · Workout`;
      }
      if (workoutChanged) {
        void this.clearNotifications();
        this.lastNotifKey = '';
      }
    }

    void this.ensureMediaSession(active, paused);
    if (paused) {
      this.stopMediaTicks();
      this.updateMediaMetadata(active, this.session.display(), true);
      this.setMediaPlaybackState('paused');
      this.suspendAudio();
    } else {
      void this.resumeAudio();
      this.setMediaPlaybackState('playing');
      this.startMediaTicks();
      this.updateMediaMetadata(active, this.session.display(), false);
    }

    if (statusChanged || workoutChanged) {
      void this.postNotificationOnce(active, this.session.display(), paused);
    }

    if (paused || this.isIos) {
      this.stopNotifTicks();
    } else {
      this.startNotifTicks();
    }
  }

  /**
   * Quietly refresh the same notification so the shade timer stays live.
   * Android: at most every 30s (LocalNotifications.schedule every second spams).
   * Web: every second via tagged SW notifications.
   */
  private startNotifTicks(): void {
    if (this.isIos || this.notifTick != null) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      this.notifTick = setInterval(() => {
        const active = this.session.active();
        if (!active || this.session.isPaused()) {
          return;
        }
        void this.postNotificationOnce(active, this.session.display(), false, true);
      }, this.notifTickMs);
    });
  }

  private stopNotifTicks(): void {
    if (this.notifTick != null) {
      clearInterval(this.notifTick);
      this.notifTick = null;
    }
  }

  /** One quiet notification: title = name, body = timer. */
  private async postNotificationOnce(
    active: ActiveWorkoutSession,
    display: string,
    paused: boolean,
    fromTick = false
  ): Promise<void> {
    if (this.isIos) {
      return;
    }

    const title = active.title.trim() || 'Workout';
    const body = paused ? `Paused · ${display}` : display;
    const key = `${active.workoutId}|${paused}|${title}|${body}`;
    if (key === this.lastNotifKey) {
      return;
    }
    if (fromTick && paused) {
      return;
    }
    this.lastNotifKey = key;

    if (this.isNativeAndroid) {
      await this.postAndroidNotification(title, body, active, fromTick);
      return;
    }

    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    const options: NotificationOptions & { renotify?: boolean } = {
      body,
      tag: NOTIF_TAG,
      silent: true,
      renotify: false,
      requireInteraction: false,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { workoutId: active.workoutId, url: `/app/workouts/${active.workoutId}` }
    };

    try {
      const reg = await this.ensureServiceWorker();
      if (reg) {
        await reg.showNotification(title, options);
        return;
      }
      if (fromTick) {
        return;
      }
      const n = new Notification(title, options);
      n.onclick = () => {
        try {
          window.focus();
        } catch {
          /* ignore */
        }
        if (!location.pathname.includes(active.workoutId)) {
          location.assign(`/app/workouts/${active.workoutId}`);
        }
        n.close();
      };
    } catch {
      /* ignore */
    }
  }

  private async postAndroidNotification(
    title: string,
    body: string,
    active: ActiveWorkoutSession,
    fromTick: boolean
  ): Promise<void> {
    const now = Date.now();
    // Hard rate-limit: never re-schedule more than once per 25s from ticks.
    if (fromTick && now - this.lastAndroidPostAt < 25_000) {
      return;
    }

    this.androidPostChain = this.androidPostChain
      .catch(() => undefined)
      .then(() => this.scheduleAndroidNotification(title, body, active, fromTick));
    await this.androidPostChain;
  }

  private async scheduleAndroidNotification(
    title: string,
    body: string,
    active: ActiveWorkoutSession,
    fromTick: boolean
  ): Promise<void> {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      if (this.nativePermGranted === false) {
        return;
      }
      if (this.nativePermGranted !== true) {
        const perm = await LocalNotifications.checkPermissions();
        this.nativePermGranted = perm.display === 'granted';
        if (!this.nativePermGranted) {
          return;
        }
      }
      await this.ensureAndroidChannel(LocalNotifications);

      const payload = {
        id: NATIVE_NOTIF_ID,
        title,
        body,
        largeBody: body,
        summaryText: APP_BRAND.name,
        channelId: ANDROID_CHANNEL_ID,
        ongoing: true,
        autoCancel: false,
        silent: true,
        isExactNotification: false,
        extra: {
          workoutId: active.workoutId,
          url: `/app/workouts/${active.workoutId}`
        }
      };

      // Replace in place — cancel first so Android does not enqueue a second alert.
      if (!fromTick) {
        try {
          await LocalNotifications.cancel({ notifications: [{ id: NATIVE_NOTIF_ID }] });
        } catch {
          /* ignore */
        }
      }
      await LocalNotifications.schedule({ notifications: [payload] });
      this.lastAndroidPostAt = Date.now();
    } catch {
      /* ignore — permission / plugin */
    }
  }

  private ensureAndroidChannel(
    LocalNotifications: typeof import('@capacitor/local-notifications').LocalNotifications
  ): Promise<void> {
    if (!this.androidChannelReady) {
      this.androidChannelReady = LocalNotifications.createChannel({
        id: ANDROID_CHANNEL_ID,
        name: 'Live workout',
        description: 'Active workout timer in the notification shade',
        // LOW: visible in shade, no sound / heads-up on each tick
        importance: 2,
        visibility: 1,
        sound: undefined,
        vibration: false,
        lights: false
      }).catch(() => {
        /* channel may already exist with different settings */
      });
    }
    return this.androidChannelReady;
  }

  private async ensureMediaSession(active: ActiveWorkoutSession, paused: boolean): Promise<void> {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }
    try {
      await this.ensureSilentAudio();
      if (!paused) {
        await this.resumeAudio();
      }
      const ms = navigator.mediaSession;
      ms.setActionHandler?.('play', () => {
        if (!this.session.active()?.running) {
          this.session.resume();
        }
      });
      ms.setActionHandler?.('pause', () => {
        if (this.session.active()?.running) {
          this.session.pause();
        }
      });
      ms.setActionHandler?.('stop', () => {
        /* end is confirmed in-app — ignore hardware stop */
      });
    } catch {
      /* Media Session / audio may be blocked */
    }
  }

  private startMediaTicks(): void {
    if (this.mediaTick != null) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      this.mediaTick = setInterval(() => {
        const active = this.session.active();
        if (!active || this.session.isPaused()) {
          return;
        }
        this.updateMediaMetadata(active, this.session.display(), false);
      }, 1000);
    });
  }

  private stopMediaTicks(): void {
    if (this.mediaTick != null) {
      clearInterval(this.mediaTick);
      this.mediaTick = null;
    }
  }

  private updateMediaMetadata(
    active: ActiveWorkoutSession,
    display: string,
    paused: boolean
  ): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: active.title.trim() || 'Workout',
        artist: paused ? `Paused · ${display}` : display,
        album: APP_BRAND.name,
        artwork: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }]
      });
    } catch {
      /* ignore */
    }
  }

  private setMediaPlaybackState(state: MediaSessionPlaybackState): void {
    try {
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = state;
      }
    } catch {
      /* ignore */
    }
  }

  /** Near-silent tone so iOS/Android keep Media Session on the lock screen. */
  private async ensureSilentAudio(): Promise<void> {
    if (this.audioCtx) {
      return;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) {
      return;
    }
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.00001;
    osc.frequency.value = 20;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    this.audioCtx = ctx;
    this.audioOsc = osc;
    this.audioGain = gain;
  }

  private async resumeAudio(): Promise<void> {
    try {
      await this.ensureSilentAudio();
      if (this.audioCtx?.state === 'suspended') {
        await this.audioCtx.resume();
      }
    } catch {
      /* ignore */
    }
  }

  private suspendAudio(): void {
    try {
      void this.audioCtx?.suspend();
    } catch {
      /* ignore */
    }
  }

  private stopAudio(): void {
    try {
      this.audioOsc?.stop();
    } catch {
      /* ignore */
    }
    try {
      void this.audioCtx?.close();
    } catch {
      /* ignore */
    }
    this.audioOsc = null;
    this.audioGain = null;
    this.audioCtx = null;
  }

  private teardown(): void {
    this.stopMediaTicks();
    this.stopNotifTicks();
    this.stopAudio();
    this.lastPaused = null;
    this.lastWorkoutId = null;
    this.lastNotifKey = '';
    this.setMediaPlaybackState('none');
    try {
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
    } catch {
      /* ignore */
    }
    void this.clearNotifications();
    if (typeof document !== 'undefined') {
      document.title = this.baseTitle || APP_BRAND.name;
    }
  }

  private async clearNotifications(): Promise<void> {
    if (this.isNativeAndroid) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.cancel({ notifications: [{ id: NATIVE_NOTIF_ID }] });
        await LocalNotifications.removeDeliveredNotificationsById({
          ids: [NATIVE_NOTIF_ID]
        });
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const reg = await this.ensureServiceWorker();
      if (reg) {
        const list = await reg.getNotifications({ tag: NOTIF_TAG });
        for (const n of list) {
          n.close();
        }
      }
    } catch {
      /* ignore */
    }
  }

  private ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return Promise.resolve(null);
    }
    if (this.swReg) {
      return Promise.resolve(this.swReg);
    }
    if (!this.swReady) {
      this.swReady = navigator.serviceWorker
        .register(SW_URL, { scope: '/' })
        .then(async (reg) => {
          await navigator.serviceWorker.ready;
          this.swReg = reg;
          return reg;
        })
        .catch(() => null);
    }
    return this.swReady;
  }

  private detectIos(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }
    if (Capacitor.getPlatform() === 'ios') {
      return true;
    }
    const ua = navigator.userAgent || '';
    const iOS = /iPad|iPhone|iPod/.test(ua);
    const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return iOS || iPadOs;
  }
}
