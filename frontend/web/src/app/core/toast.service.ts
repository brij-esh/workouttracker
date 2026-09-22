import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly toasts = signal<ToastMessage[]>([]);

  success(text: string, durationMs = 2800): void {
    this.push('success', text, durationMs);
  }

  error(text: string, durationMs = 3600): void {
    this.push('error', text, durationMs);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts.update((rows) => rows.filter((t) => t.id !== id));
  }

  private push(kind: ToastKind, text: string, durationMs: number): void {
    const id = this.nextId++;
    this.toasts.update((rows) => [...rows, { id, kind, text }].slice(-4));
    const timer = setTimeout(() => this.dismiss(id), durationMs);
    this.timers.set(id, timer);
  }
}
