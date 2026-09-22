import { HttpClient, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth/auth.service';
import { ApiCacheService } from './api-cache.service';
import { ToastService } from './toast.service';
import { environment } from '../../environments/environment';

export const OFFLINE_REPLAY_HEADER = 'X-Offline-Replay';

export interface OutboxEntry {
  id: string;
  uid: string;
  method: string;
  url: string;
  body: unknown;
  headers: Record<string, string>;
  createdAt: number;
  attempts: number;
}

const DB_NAME = 'wt.outbox.v1';
const STORE = 'mutations';
const MAX_ATTEMPTS = 5;

@Injectable({ providedIn: 'root' })
export class OfflineOutboxService {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly cache = inject(ApiCacheService);
  private readonly toast = inject(ToastService);

  readonly pendingCount = signal(0);
  readonly syncing = signal(false);
  readonly offline = signal(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  private dbPromise: Promise<IDBDatabase> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('online', () => {
      this.offline.set(false);
      void this.flush();
    });
    window.addEventListener('offline', () => this.offline.set(true));
    void this.refreshCount();
    this.flushTimer = setInterval(() => void this.flush(), 15_000);
    queueMicrotask(() => void this.flush());
  }

  /** CORS-safe reachability probe (actuator/health is outside gateway CORS). */
  healthUrl(): string {
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    return `${base}/users/me`;
  }

  async isServerReachable(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.offline.set(true);
      return false;
    }
    try {
      // Any HTTP response (incl. 401) means the gateway answered.
      // Network / CORS failures throw and mean unreachable.
      await fetch(this.healthUrl(), {
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        headers: { Accept: 'application/json' }
      });
      this.offline.set(false);
      return true;
    } catch {
      this.offline.set(true);
      return false;
    }
  }

  async enqueueFromRequest(req: HttpRequest<unknown>): Promise<OutboxEntry> {
    const uid = this.auth.user()?.uid ?? 'anon';
    const entry: OutboxEntry = {
      id: crypto.randomUUID(),
      uid,
      method: req.method.toUpperCase(),
      url: req.urlWithParams,
      body: req.body ?? null,
      headers: this.captureHeaders(req.headers),
      createdAt: Date.now(),
      attempts: 0
    };
    await this.put(entry);
    await this.refreshCount();
    this.applyOptimisticCache(entry);
    this.toast.success('Saved offline — will sync when the server is back', 3200);
    return entry;
  }

  /** Synthetic response body for intercepted offline writes. */
  optimisticBody(req: HttpRequest<unknown>, entry: OutboxEntry): unknown {
    const body = (req.body && typeof req.body === 'object' ? { ...(req.body as object) } : {}) as Record<
      string,
      unknown
    >;
    if (req.method.toUpperCase() === 'DELETE') {
      return null;
    }
    return {
      id: `local-${entry.id}`,
      ...body,
      pendingSync: true,
      createdAt: new Date(entry.createdAt).toISOString(),
      updatedAt: new Date(entry.createdAt).toISOString()
    };
  }

  async flush(): Promise<void> {
    if (this.flushing) {
      return;
    }
    const uid = this.auth.user()?.uid;
    if (!uid) {
      return;
    }
    if (!(await this.isServerReachable())) {
      return;
    }

    this.flushing = true;
    this.syncing.set(true);
    try {
      const queue = (await this.listForUser(uid)).sort((a, b) => a.createdAt - b.createdAt);
      let synced = 0;
      for (const entry of queue) {
        try {
          await this.replay(entry);
          await this.remove(entry.id);
          synced++;
        } catch (err) {
          const status = (err as { status?: number })?.status;
          entry.attempts += 1;
          if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
            await this.remove(entry.id);
            this.toast.error('Offline change could not sync and was dropped');
            continue;
          }
          if (entry.attempts >= MAX_ATTEMPTS) {
            await this.remove(entry.id);
            this.toast.error('Offline change failed too many times and was dropped');
            continue;
          }
          await this.put(entry);
          break;
        }
      }
      if (synced > 0) {
        this.cache.invalidate(
          'profile',
          'workouts',
          'workout-plans',
          'progress',
          'nutrition',
          'library',
          'notifications',
          'archived'
        );
        this.toast.success(
          synced === 1 ? 'Synced 1 offline change' : `Synced ${synced} offline changes`,
          2800
        );
      }
    } finally {
      this.flushing = false;
      this.syncing.set(false);
      await this.refreshCount();
    }
  }

  private async replay(entry: OutboxEntry): Promise<void> {
    const headers = new HttpHeaders({
      ...entry.headers,
      [OFFLINE_REPLAY_HEADER]: '1'
    });
    await firstValueFrom(
      this.http.request(entry.method, entry.url, {
        body: entry.body,
        headers,
        observe: 'response',
        responseType: 'json'
      })
    );
  }

  private captureHeaders(headers: HttpHeaders): Record<string, string> {
    const out: Record<string, string> = {};
    for (const key of headers.keys()) {
      const lower = key.toLowerCase();
      if (lower === 'authorization' || lower === OFFLINE_REPLAY_HEADER.toLowerCase()) {
        continue;
      }
      const val = headers.get(key);
      if (val) {
        out[key] = val;
      }
    }
    return out;
  }

  private applyOptimisticCache(entry: OutboxEntry): void {
    const url = entry.url;
    const method = entry.method;
    const body = (entry.body && typeof entry.body === 'object' ? entry.body : {}) as Record<string, unknown>;
    const localId = `local-${entry.id}`;

    if (/\/progress\/weight(\?|$)/i.test(url) && method === 'POST') {
      const prev = this.cache.peek<Array<Record<string, unknown>>>('progress:weight') ?? [];
      this.cache.set(
        'progress:weight',
        [{ id: localId, ...body, pendingSync: true }, ...prev],
        ['progress']
      );
      return;
    }

    if (/\/progress\/personal-records(\?|$)/i.test(url) && method === 'POST') {
      const prev = this.cache.peek<Array<Record<string, unknown>>>('progress:prs') ?? [];
      this.cache.set(
        'progress:prs',
        [{ id: localId, ...body, pendingSync: true }, ...prev],
        ['progress']
      );
      return;
    }

    if (/\/progress\/weight\/[^/]+$/i.test(url) && method === 'PUT') {
      const id = url.split('/').pop()!;
      const prev = this.cache.peek<Array<Record<string, unknown>>>('progress:weight') ?? [];
      this.cache.set(
        'progress:weight',
        prev.map((row) => (row['id'] === id ? { ...row, ...body, pendingSync: true } : row)),
        ['progress']
      );
      return;
    }

    if (/\/progress\/personal-records\/[^/]+$/i.test(url) && method === 'PUT') {
      const id = url.split('/').pop()!;
      const prev = this.cache.peek<Array<Record<string, unknown>>>('progress:prs') ?? [];
      this.cache.set(
        'progress:prs',
        prev.map((row) => (row['id'] === id ? { ...row, ...body, pendingSync: true } : row)),
        ['progress']
      );
    }
  }

  private async refreshCount(): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid) {
      this.pendingCount.set(0);
      return;
    }
    const rows = await this.listForUser(uid);
    this.pendingCount.set(rows.length);
  }

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('uid', 'uid', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    });
    return this.dbPromise;
  }

  private async put(entry: OutboxEntry): Promise<void> {
    const db = await this.openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('outbox put failed'));
    });
  }

  private async remove(id: string): Promise<void> {
    const db = await this.openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('outbox delete failed'));
    });
  }

  private async listForUser(uid: string): Promise<OutboxEntry[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const idx = tx.objectStore(STORE).index('uid');
      const req = idx.getAll(uid);
      req.onsuccess = () => resolve((req.result as OutboxEntry[]) ?? []);
      req.onerror = () => reject(req.error ?? new Error('outbox list failed'));
    });
  }
}
