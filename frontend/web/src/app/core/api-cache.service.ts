import { Injectable, inject, effect } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  of,
  shareReplay,
  tap,
  throwError
} from 'rxjs';
import { AuthService } from './auth/auth.service';

/** Logical groups invalidated together when related data changes. */
export type CacheScope =
  | 'profile'
  | 'workouts'
  | 'workout-plans'
  | 'progress'
  | 'nutrition'
  | 'library'
  | 'notifications'
  | 'archived';

export interface CacheLoadOptions {
  /** Treat entry as fresh for this many ms (skip network). Default 60s. */
  maxAgeMs?: number;
  /**
   * When stale data exists, emit it immediately then refresh in the background.
   * Default true — keeps UI responsive while navigating between tabs.
   */
  staleWhileRevalidate?: boolean;
}

interface CacheEntry {
  data: unknown;
  scopes: CacheScope[];
  cachedAt: number;
}

const STORAGE_PREFIX = 'wt.api.cache.v2';
const DEFAULT_MAX_AGE_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class ApiCacheService {
  private readonly auth = inject(AuthService);
  private readonly memory = new Map<string, CacheEntry>();
  private readonly inflight = new Map<string, Observable<unknown>>();

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (!user) {
        this.clear();
        return;
      }
      this.hydrate(user.uid);
    });
  }

  /**
   * Return cached value when fresh; when stale, emit cache immediately and
   * refresh in the background (next caller gets updated data). On miss, load.
   * Concurrent loads for the same key are deduped.
   */
  getOrLoad<T>(
    key: string,
    scopes: CacheScope[],
    loader: () => Observable<T>,
    options?: CacheLoadOptions
  ): Observable<T> {
    const maxAgeMs = options?.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
    const swr = options?.staleWhileRevalidate !== false;
    const hit = this.memory.get(key);
    const age = hit ? Date.now() - hit.cachedAt : Number.POSITIVE_INFINITY;

    if (hit && age <= maxAgeMs) {
      return of(hit.data as T);
    }

    if (hit && swr) {
      // Instant UI; refresh cache without blocking this subscriber (safe with forkJoin).
      this.loadNetwork(key, scopes, loader).subscribe({ error: () => undefined });
      return of(hit.data as T);
    }

    return this.loadNetwork(key, scopes, loader);
  }

  /** Replace a cache entry (e.g. after a successful write that returns fresh data). */
  set<T>(key: string, data: T, scopes: CacheScope[]): void {
    this.memory.set(key, { data, scopes: [...scopes], cachedAt: Date.now() });
    this.persist();
  }

  peek<T>(key: string): T | null {
    const hit = this.memory.get(key);
    return hit ? (hit.data as T) : null;
  }

  /** Age of a cache entry in ms, or null if missing. */
  ageMs(key: string): number | null {
    const hit = this.memory.get(key);
    return hit ? Date.now() - hit.cachedAt : null;
  }

  isFresh(key: string, maxAgeMs = DEFAULT_MAX_AGE_MS): boolean {
    const age = this.ageMs(key);
    return age != null && age <= maxAgeMs;
  }

  invalidate(...scopes: CacheScope[]): void {
    if (!scopes.length) {
      return;
    }
    const drop = new Set(scopes);
    for (const [key, entry] of this.memory) {
      if (entry.scopes.some((s) => drop.has(s))) {
        this.memory.delete(key);
      }
    }
    this.persist();
  }

  invalidateKeys(...keys: string[]): void {
    for (const key of keys) {
      this.memory.delete(key);
    }
    this.persist();
  }

  clear(): void {
    this.memory.clear();
    this.inflight.clear();
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('wt.api.cache.')) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {
      /* ignore */
    }
  }

  private loadNetwork<T>(
    key: string,
    scopes: CacheScope[],
    loader: () => Observable<T>
  ): Observable<T> {
    const pending = this.inflight.get(key);
    if (pending) {
      return pending as Observable<T>;
    }

    const shared = loader().pipe(
      tap((data) => this.set(key, data, scopes)),
      catchError((err) => {
        const stale = this.memory.get(key);
        if (stale) {
          return of(stale.data as T);
        }
        return throwError(() => err);
      }),
      finalize(() => this.inflight.delete(key)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.inflight.set(key, shared);
    return shared;
  }

  private hydrate(uid: string): void {
    if (this.memory.size > 0) {
      return;
    }
    try {
      const raw =
        sessionStorage.getItem(this.storageKey(uid)) ??
        sessionStorage.getItem(`wt.api.cache.v1:${uid}`);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
      const now = Date.now();
      for (const [key, entry] of Object.entries(parsed)) {
        if (entry?.scopes && 'data' in entry) {
          this.memory.set(key, {
            data: entry.data,
            scopes: entry.scopes,
            cachedAt: typeof entry.cachedAt === 'number' ? entry.cachedAt : now
          });
        }
      }
    } catch {
      /* ignore corrupt cache */
    }
  }

  private persist(): void {
    try {
      const uid = this.auth.user()?.uid;
      if (!uid) {
        return;
      }
      const payload: Record<string, CacheEntry> = {};
      for (const [key, entry] of this.memory) {
        payload[key] = entry;
      }
      sessionStorage.setItem(this.storageKey(uid), JSON.stringify(payload));
    } catch {
      /* quota / private mode */
    }
  }

  private storageKey(uid: string): string {
    return `${STORAGE_PREFIX}:${uid}`;
  }
}
