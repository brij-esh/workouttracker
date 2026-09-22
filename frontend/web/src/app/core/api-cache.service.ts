import { Injectable, inject, effect } from '@angular/core';
import { Observable, finalize, of, shareReplay, tap } from 'rxjs';
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

interface CacheEntry {
  data: unknown;
  scopes: CacheScope[];
}

const STORAGE_PREFIX = 'wt.api.cache.v1';

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
   * Return cached value when present; otherwise run `loader`, store result, and
   * dedupe concurrent requests for the same key.
   */
  getOrLoad<T>(key: string, scopes: CacheScope[], loader: () => Observable<T>): Observable<T> {
    const hit = this.memory.get(key);
    if (hit) {
      return of(hit.data as T);
    }

    const pending = this.inflight.get(key);
    if (pending) {
      return pending as Observable<T>;
    }

    const shared = loader().pipe(
      tap((data) => this.set(key, data, scopes)),
      finalize(() => this.inflight.delete(key)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.inflight.set(key, shared);
    return shared;
  }

  /** Replace a cache entry (e.g. after a successful write that returns fresh data). */
  set<T>(key: string, data: T, scopes: CacheScope[]): void {
    this.memory.set(key, { data, scopes: [...scopes] });
    this.persist();
  }

  peek<T>(key: string): T | null {
    const hit = this.memory.get(key);
    return hit ? (hit.data as T) : null;
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
        if (key?.startsWith(STORAGE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {
      /* ignore */
    }
  }

  private hydrate(uid: string): void {
    if (this.memory.size > 0) {
      return;
    }
    try {
      const raw = sessionStorage.getItem(this.storageKey(uid));
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
      for (const [key, entry] of Object.entries(parsed)) {
        if (entry?.scopes && 'data' in entry) {
          this.memory.set(key, entry);
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
