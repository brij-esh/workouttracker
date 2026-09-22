import { Injectable, signal, computed, effect } from '@angular/core';

export type AppTheme = 'dark' | 'light';

const STORAGE_KEY = 'wt.theme.v1';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeSignal = signal<AppTheme>(this.readStored());

  readonly theme = this.themeSignal.asReadonly();
  readonly isDark = computed(() => this.themeSignal() === 'dark');
  readonly isLight = computed(() => this.themeSignal() === 'light');

  constructor() {
    effect(() => {
      const theme = this.themeSignal();
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.colorScheme = theme;
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        /* ignore */
      }
    });
  }

  setTheme(theme: AppTheme): void {
    this.themeSignal.set(theme);
  }

  toggle(): void {
    this.themeSignal.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  private readStored(): AppTheme {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'light' || raw === 'dark') {
        return raw;
      }
    } catch {
      /* ignore */
    }
    return 'dark';
  }
}
