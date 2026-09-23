import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="toast-host" aria-live="polite" aria-relevant="additions">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class.success]="toast.kind === 'success'" [class.error]="toast.kind === 'error'" role="status">
          <span class="icon" aria-hidden="true">
            @if (toast.kind === 'success') {
              ✓
            } @else {
              !
            }
          </span>
          <span class="text">{{ toast.text }}</span>
          <button type="button" class="close" (click)="toasts.dismiss(toast.id)" aria-label="Dismiss">✕</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-host {
        position: fixed;
        z-index: 200;
        right: 1rem;
        bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
        display: grid;
        gap: 0.55rem;
        width: min(22rem, calc(100vw - 2rem));
        pointer-events: none;
      }

      .toast {
        pointer-events: auto;
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.65rem;
        align-items: center;
        padding: 0.85rem 0.95rem;
        border-radius: 0.9rem;
        border: 1px solid var(--line);
        background: color-mix(in srgb, var(--panel) 96%, transparent);
        backdrop-filter: blur(12px);
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
        animation: toast-in 0.22s ease both;
      }

      .toast.success {
        border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
      }

      .toast.error {
        border-color: color-mix(in srgb, #fb7185 50%, var(--line));
      }

      .icon {
        width: 1.7rem;
        height: 1.7rem;
        display: grid;
        place-items: center;
        border-radius: 999px;
        font-weight: 700;
        font-size: 0.85rem;
      }

      .toast.success .icon {
        background: color-mix(in srgb, var(--accent) 22%, transparent);
        color: var(--accent);
      }

      .toast.error .icon {
        background: color-mix(in srgb, #fb7185 18%, transparent);
        color: #fb7185;
      }

      .text {
        font-size: 0.92rem;
        font-weight: 600;
        overflow-wrap: anywhere;
      }

      .close {
        border: 0;
        background: transparent;
        color: var(--muted);
        min-height: 1.8rem;
        min-width: 1.8rem;
        padding: 0;
        cursor: pointer;
        border-radius: 0.45rem;
      }

      .close:hover {
        color: var(--text);
        background: color-mix(in srgb, var(--text) 8%, transparent);
      }

      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 767px) {
        .toast-host {
          bottom: calc(var(--app-bottom-inset, 4.35rem) + 0.75rem);
          left: 50%;
          right: auto;
          transform: translateX(-50%);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .toast {
          animation: none;
        }
      }
    `
  ]
})
export class ToastHostComponent {
  readonly toasts = inject(ToastService);
}
