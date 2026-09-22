import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  meta?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly state = signal<ConfirmDialogOptions | null>(null);
  private resolveFn: ((ok: boolean) => void) | null = null;

  ask(options: ConfirmDialogOptions): Promise<boolean> {
    if (this.resolveFn) {
      this.resolveFn(false);
      this.resolveFn = null;
    }
    this.state.set({
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      danger: false,
      ...options
    });
    return new Promise<boolean>((resolve) => {
      this.resolveFn = resolve;
    });
  }

  accept(): void {
    this.finish(true);
  }

  cancel(): void {
    this.finish(false);
  }

  private finish(ok: boolean): void {
    const resolve = this.resolveFn;
    this.resolveFn = null;
    this.state.set(null);
    resolve?.(ok);
  }
}
