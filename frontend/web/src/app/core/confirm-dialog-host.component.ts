import { Component, inject } from '@angular/core';
import { ConfirmDialogService } from './confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog-host',
  standalone: true,
  template: `
    @if (dialog.state(); as box) {
      <div class="backdrop" (click)="dialog.cancel()" role="presentation"></div>
      <div class="box" role="dialog" aria-modal="true" [attr.aria-label]="box.title">
        <h3>{{ box.title }}</h3>
        <p>{{ box.message }}</p>
        @if (box.meta) {
          <p class="meta">{{ box.meta }}</p>
        }
        <div class="actions">
          <button type="button" class="secondary" (click)="dialog.cancel()">
            {{ box.cancelLabel || 'Cancel' }}
          </button>
          <button
            type="button"
            class="primary"
            [class.danger]="box.danger"
            (click)="dialog.accept()"
          >
            {{ box.confirmLabel || 'Confirm' }}
          </button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 260;
        background: rgba(4, 8, 6, 0.72);
      }
      .box {
        position: fixed;
        z-index: 261;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: min(26rem, calc(100vw - 1.5rem));
        padding: 1.15rem 1.2rem;
        border-radius: 1rem;
        border: 1px solid var(--line);
        background: var(--panel);
        display: grid;
        gap: 0.7rem;
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
      }
      h3 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.15rem;
        color: var(--text);
      }
      p {
        margin: 0;
        line-height: 1.45;
        color: var(--text);
      }
      .meta {
        color: var(--muted);
        font-size: 0.88rem;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 0.55rem;
        margin-top: 0.35rem;
      }
      .actions .primary.danger {
        background: var(--danger-fill);
        border-color: var(--danger-fill);
        color: #fff !important;
      }
      .actions .primary.danger:hover:not(:disabled) {
        background: color-mix(in srgb, var(--danger-fill) 82%, #000);
        border-color: color-mix(in srgb, var(--danger-fill) 82%, #000);
        color: #fff !important;
        filter: none;
      }
      @media (max-width: 560px) {
        .actions {
          flex-direction: column-reverse;
        }
        .actions .secondary,
        .actions .primary {
          width: 100%;
        }
      }
    `
  ]
})
export class ConfirmDialogHostComponent {
  readonly dialog = inject(ConfirmDialogService);
}
