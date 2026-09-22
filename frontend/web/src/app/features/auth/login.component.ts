import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { APP_BRAND } from '../../core/app-brand';

/** Chrome Android Web OTP API credential shape. */
interface OtpCredential extends Credential {
  code: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnDestroy, AfterViewChecked {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private otpAbort: AbortController | null = null;
  private otpAutofillStarted = false;
  private shouldFocusOtp = false;

  @ViewChild('otpInput') otpInput?: ElementRef<HTMLInputElement>;

  readonly brand = APP_BRAND;

  readonly mode = signal<'login' | 'register'>('login');
  readonly method = signal<'email' | 'phone'>('email');
  readonly phoneStep = signal<'phone' | 'otp'>('phone');
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly busy = signal(false);
  readonly showPassword = signal(false);
  readonly otpSentTo = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  readonly phoneForm = this.fb.nonNullable.group({
    countryCode: ['+91', [Validators.required, Validators.pattern(/^\+\d{1,4}$/)]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{8,12}$/)]]
  });

  readonly otpForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  get emailInvalid(): boolean {
    const c = this.form.controls.email;
    return c.touched && c.invalid;
  }

  get passwordInvalid(): boolean {
    const c = this.form.controls.password;
    return c.touched && c.invalid;
  }

  get phoneInvalid(): boolean {
    const c = this.phoneForm.controls.phone;
    return c.touched && c.invalid;
  }

  get countryInvalid(): boolean {
    const c = this.phoneForm.controls.countryCode;
    return c.touched && c.invalid;
  }

  get otpInvalid(): boolean {
    const c = this.otpForm.controls.code;
    return c.touched && c.invalid;
  }

  ngAfterViewChecked(): void {
    if (this.shouldFocusOtp && this.otpInput?.nativeElement) {
      this.otpInput.nativeElement.focus();
      this.shouldFocusOtp = false;
    }
  }

  ngOnDestroy(): void {
    this.stopOtpAutofill();
    this.auth.clearPhoneAuth();
  }

  setMode(next: 'login' | 'register'): void {
    if (this.mode() === next) {
      return;
    }
    this.mode.set(next);
    this.error.set(null);
    this.info.set(null);
    this.form.controls.password.reset('');
    this.showPassword.set(false);
  }

  setMethod(next: 'email' | 'phone'): void {
    if (this.method() === next) {
      return;
    }
    this.method.set(next);
    this.error.set(null);
    this.info.set(null);
    this.phoneStep.set('phone');
    this.otpSentTo.set(null);
    this.otpForm.reset({ code: '' });
    this.stopOtpAutofill();
    this.auth.clearPhoneAuth();
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.info.set(null);
    const { email, password } = this.form.getRawValue();
    try {
      if (this.mode() === 'login') {
        await this.auth.loginEmail(email, password);
      } else {
        await this.auth.registerEmail(email, password);
      }
      await this.continueAfterAuth(
        this.mode() === 'register'
          ? 'Account created. Verify your email to unlock access.'
          : null
      );
    } catch (err: unknown) {
      this.error.set(this.message(err));
    } finally {
      this.busy.set(false);
    }
  }

  async sendOtp(): Promise<void> {
    if (this.phoneForm.invalid) {
      this.phoneForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.info.set(null);
    const e164 = this.toE164();
    try {
      this.auth.ensureRecaptcha('recaptcha-container');
      await this.auth.sendPhoneOtp(e164);
      this.otpSentTo.set(e164);
      this.phoneStep.set('otp');
      this.otpForm.reset({ code: '' });
      this.shouldFocusOtp = true;
      this.info.set('On mobile, the code can fill in automatically from SMS.');
      this.startOtpAutofill();
    } catch (err: unknown) {
      this.auth.clearPhoneAuth();
      this.error.set(this.message(err));
    } finally {
      this.busy.set(false);
    }
  }

  async verifyOtp(): Promise<void> {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      this.stopOtpAutofill();
      await this.auth.verifyPhoneOtp(this.otpForm.controls.code.value);
      await this.continueAfterAuth();
    } catch (err: unknown) {
      this.error.set(this.message(err));
      this.startOtpAutofill();
    } finally {
      this.busy.set(false);
    }
  }

  changePhone(): void {
    this.stopOtpAutofill();
    this.phoneStep.set('phone');
    this.otpSentTo.set(null);
    this.otpForm.reset({ code: '' });
    this.error.set(null);
    this.info.set(null);
    this.auth.clearPhoneAuth();
  }

  async resendOtp(): Promise<void> {
    const e164 = this.otpSentTo() ?? this.toE164();
    this.busy.set(true);
    this.error.set(null);
    this.otpForm.reset({ code: '' });
    this.stopOtpAutofill();
    this.auth.clearPhoneAuth();
    try {
      this.auth.ensureRecaptcha('recaptcha-container');
      await this.auth.sendPhoneOtp(e164);
      this.otpSentTo.set(e164);
      this.phoneStep.set('otp');
      this.shouldFocusOtp = true;
      this.info.set('New code sent. On mobile it may autofill from SMS.');
      this.startOtpAutofill();
    } catch (err: unknown) {
      this.auth.clearPhoneAuth();
      this.error.set(this.message(err));
    } finally {
      this.busy.set(false);
    }
  }

  async google(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    this.info.set(null);
    try {
      await this.auth.loginGoogle();
      await this.continueAfterAuth();
    } catch (err: unknown) {
      this.error.set(this.message(err));
    } finally {
      this.busy.set(false);
    }
  }

  private async continueAfterAuth(lockedInfo: string | null = null): Promise<void> {
    if (this.auth.isAccountLocked()) {
      if (lockedInfo) {
        this.info.set(lockedInfo);
      }
      await this.router.navigateByUrl('/verify-email');
      return;
    }
    await this.router.navigateByUrl('/app');
  }

  private startOtpAutofill(): void {
    this.stopOtpAutofill();
    this.otpAutofillStarted = true;

    // Web OTP API — Chrome/Edge on Android when the tab is open
    if (!('OTPCredential' in window) || !navigator.credentials?.get) {
      return;
    }

    this.otpAbort = new AbortController();
    const options = {
      otp: { transport: ['sms'] },
      signal: this.otpAbort.signal
    } as CredentialRequestOptions;

    void navigator.credentials
      .get(options)
      .then((cred) => {
        if (!this.otpAutofillStarted) {
          return;
        }
        const code = (cred as OtpCredential | null)?.code;
        if (!code) {
          return;
        }
        this.otpForm.controls.code.setValue(code.replace(/\D/g, '').slice(0, 6));
        if (this.otpForm.valid) {
          void this.verifyOtp();
        }
      })
      .catch(() => {
        /* user dismissed prompt or unsupported SMS format */
      });
  }

  private stopOtpAutofill(): void {
    this.otpAutofillStarted = false;
    this.otpAbort?.abort();
    this.otpAbort = null;
  }

  private toE164(): string {
    const { countryCode, phone } = this.phoneForm.getRawValue();
    const digits = phone.replace(/\D/g, '');
    const cc = countryCode.trim().startsWith('+')
      ? countryCode.trim()
      : `+${countryCode.trim()}`;
    return `${cc}${digits}`;
  }

  private message(err: unknown): string {
    const text =
      typeof err === 'object' && err && 'message' in err
        ? String((err as { message: string }).message)
        : '';
    if (/region enabled/i.test(text) || /SMS unable to be sent/i.test(text)) {
      return 'SMS is blocked for this country. In Firebase Console → Authentication → Settings → SMS region policy, allow your region (e.g. IN).';
    }
    if (typeof err === 'object' && err && 'code' in err) {
      const code = String((err as { code: string }).code);
      if (code.includes('invalid-credential') || code.includes('wrong-password')) {
        return 'Email or password is incorrect.';
      }
      if (code.includes('email-already-in-use')) {
        return 'That email is already registered. Try signing in.';
      }
      if (code.includes('popup-closed')) {
        return 'Google sign-in was cancelled.';
      }
      if (code.includes('invalid-phone-number')) {
        return 'Enter a valid phone number with country code.';
      }
      if (
        code.includes('operation-not-allowed') ||
        code.includes('OPERATION_NOT_ALLOWED')
      ) {
        return 'SMS is blocked for this country. In Firebase Console → Authentication → Settings → SMS region policy, allow your region (e.g. IN).';
      }
      if (code.includes('too-many-requests')) {
        return 'Too many attempts. Wait a moment and try again.';
      }
      if (code.includes('code-expired') || code.includes('session-expired')) {
        return 'That code expired. Request a new one.';
      }
      if (code.includes('invalid-verification-code')) {
        return 'That code is incorrect. Check the SMS and try again.';
      }
      if (code.includes('missing-phone-number')) {
        return 'Enter your phone number first.';
      }
      if (code.includes('captcha-check-failed') || code.includes('argument-error')) {
        return 'Security check failed. Refresh and try again.';
      }
      return code.replace('auth/', '').replaceAll('-', ' ');
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return 'Something went wrong. Try again.';
  }
}
