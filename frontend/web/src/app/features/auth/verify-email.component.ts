import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { APP_BRAND } from '../../core/app-brand';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss'
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly brand = APP_BRAND;
  readonly email = this.auth.email;
  readonly busy = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.pollTimer = setInterval(() => {
      void this.checkVerified(false);
    }, 4000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async resend(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.message.set(null);
    try {
      await this.auth.sendVerificationEmail();
      this.message.set('Verification email sent. Check your inbox and spam folder.');
    } catch (err: unknown) {
      this.error.set(this.messageFrom(err));
    } finally {
      this.busy.set(false);
    }
  }

  async checkVerified(showIdleMessage = true): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.reloadCurrentUser();
      if (!this.auth.isAccountLocked()) {
        await this.router.navigateByUrl('/app');
        return;
      }
      if (showIdleMessage) {
        this.message.set('Still waiting on verification. Open the link in your email, then try again.');
      }
    } catch (err: unknown) {
      this.error.set(this.messageFrom(err));
    } finally {
      this.busy.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }

  private messageFrom(err: unknown): string {
    if (typeof err === 'object' && err && 'code' in err) {
      const code = String((err as { code: string }).code);
      if (code.includes('too-many-requests')) {
        return 'Too many emails sent. Wait a bit before requesting another.';
      }
      return code.replace('auth/', '').replaceAll('-', ' ');
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return 'Something went wrong. Try again.';
  }
}
