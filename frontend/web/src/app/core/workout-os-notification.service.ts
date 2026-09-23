import { Injectable, NgZone, effect, inject, untracked } from '@angular/core';
import { ActiveWorkoutSession, ActiveWorkoutSessionService } from './active-workout-session.service';
import { APP_BRAND } from './app-brand';

const NOTIF_TAG = 'wt.active-workout';
const SW_URL = '/sw.js';

/**
 * Lock-screen workout presence:
 * - Live timer via Media Session (no banner spam).
 * - OS notification only on start / pause / resume / end — never on a tick.
 * - Notification text is only workout name + timer.
 * - iPhone: skip OS notification updates entirely (Apple treats replaces as new alerts);
 *   live time still shows via Now Playing / Media Session.
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

  private mediaTick: ReturnType<typeof setInterval> | null = null;
  private notifTick: ReturnType<typeof setInterval> | null = null;
  private audioCtx: AudioContext | null = null;
  private audioGain: GainNode | null = null;
  private audioOsc: OscillatorNode | null = null;
  private readonly isIos = this.detectIos();

  constructor() {
    if (typeof document !== 'undefined') {
      this.baseTitle = document.title || APP_BRAND.name;
    }
    void this.ensureServiceWorker();

    effect(() => {
      const active = this.session.active();
      const paused = this.session.isPaused();
      // Never read display() here — that re-runs every second and spam-posts.
      untracked(() => this.sync(active, paused));
    });
  }

  /** Prefer calling from a user gesture (starting a workout). */
  async ensurePermission(): Promise<NotificationPermission | 'unsupported'> {
    // iOS web notifications cannot update a live timer without spamming banners.
    if (this.isIos) {
      return 'unsupported';
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
      // Clear any stacked banners left from older builds (esp. iPhone).
      if (workoutChanged) {
        void this.clearNotifications();
        this.lastNotifKey = '';
      }
    }

    // Live lock-screen clock (Media Session) — not Notification banners.
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

    // Discrete OS notification only when session state changes (Android/desktop).
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
   * Android/desktop only: silently replace the same tagged notification each second
   * so the shade/lock timer stays live without banner spam (renotify:false + silent).
   * iPhone skips this — Apple treats replaces as new alerts.
   */
  private startNotifTicks(): void {
    if (this.isIos || this.notifTick != null) {
      return;
    }
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }
    this.zone.runOutsideAngular(() => {
      this.notifTick = setInterval(() => {
        const active = this.session.active();
        if (!active || this.session.isPaused()) {
          return;
        }
        void this.postNotificationOnce(active, this.session.display(), false, true);
      }, 1000);
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
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    const title = active.title.trim() || 'Workout';
    const body = paused ? `Paused · ${display}` : display;
    const key = `${active.workoutId}|${paused}|${title}|${body}`;
    if (key === this.lastNotifKey) {
      return;
    }
    // Tick updates must only change when the clock text changes (already keyed above).
    if (fromTick && paused) {
      return;
    }
    this.lastNotifKey = key;

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
      // Avoid constructing Notification every second on desktop — SW path preferred.
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
    // Extremely quiet — keeps session alive without an audible tone.
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
    const ua = navigator.userAgent || '';
    const iOS = /iPad|iPhone|iPod/.test(ua);
    const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return iOS || iPadOs;
  }
}
