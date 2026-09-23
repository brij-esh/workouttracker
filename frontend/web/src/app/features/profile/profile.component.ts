import { Component, OnDestroy, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme.service';
import { ToastService } from '../../core/toast.service';
import { RegionService } from '../../core/region.service';
import { NutritionTargetsSyncService } from '../../core/nutrition-targets-sync.service';
import { StepsPlatformService } from '../../core/steps-platform.service';
import { UserProfile } from '../../core/models';
import { DateInputComponent } from '../../shared/date-input.component';
import { AppSelectOption, SelectComponent } from '../../shared/select.component';
import { AvatarCropperComponent } from './avatar-cropper.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    RouterLink,
    SelectComponent,
    DateInputComponent,
    AvatarCropperComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly region = inject(RegionService);
  readonly stepsPlatform = inject(StepsPlatformService);
  private readonly toast = inject(ToastService);
  private readonly nutritionSync = inject(NutritionTargetsSyncService);

  readonly profile = signal<UserProfile | null>(null);
  readonly isNew = signal(false);
  readonly error = signal<string | null>(null);
  readonly saved = signal(false);
  readonly detecting = signal<'timezone' | 'location' | null>(null);
  readonly syncBusy = signal<'device' | 'wearable' | null>(null);

  readonly cropSrc = signal<string | null>(null);
  readonly photoBusy = signal(false);

  /** DOB: allow ~100 years back through today. */
  readonly dobMax = this.localDateKey();
  readonly dobMin = this.shiftYears(this.dobMax, -100);

  readonly editingEmail = signal(false);
  readonly emailBusy = signal(false);
  readonly emailMessage = signal<string | null>(null);
  readonly emailError = signal<string | null>(null);

  readonly editingPhone = signal(false);
  readonly phoneStep = signal<'phone' | 'otp'>('phone');
  readonly phoneBusy = signal(false);
  readonly phoneMessage = signal<string | null>(null);
  readonly phoneError = signal<string | null>(null);
  readonly otpSentTo = signal<string | null>(null);

  private otpAbort: AbortController | null = null;
  private cropObjectUrl: string | null = null;

  readonly form = this.fb.nonNullable.group({
    displayName: ['', Validators.required],
    heightCm: [null as number | null],
    weightKg: [null as number | null],
    dateOfBirth: [''],
    gender: ['MALE'],
    fitnessGoal: ['BUILD_MUSCLE'],
    activityLevel: ['MODERATE'],
    preferredUnits: ['METRIC'],
    timezone: [''],
    region: [''],
    onboardingCompleted: [true]
  });

  readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  readonly phoneForm = this.fb.nonNullable.group({
    countryCode: ['+91', [Validators.required, Validators.pattern(/^\+\d{1,4}$/)]],
    phone: ['', [Validators.required, Validators.pattern(/^\d{8,12}$/)]]
  });

  readonly otpForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  readonly genderLabels: Record<string, string> = {
    MALE: 'Male',
    FEMALE: 'Female',
    OTHER: 'Other',
    PREFER_NOT_TO_SAY: 'Prefer not to say'
  };

  readonly goalLabels: Record<string, string> = {
    LOSE_WEIGHT: 'Lose weight',
    BUILD_MUSCLE: 'Build muscle',
    STAY_FIT: 'Stay fit',
    ENDURANCE: 'Endurance',
    GENERAL_HEALTH: 'General health'
  };

  readonly activityLabels: Record<string, string> = {
    SEDENTARY: 'Sedentary',
    LIGHT: 'Light',
    MODERATE: 'Moderate',
    ACTIVE: 'Active',
    VERY_ACTIVE: 'Very active'
  };

  readonly unitLabels: Record<string, string> = {
    METRIC: 'Metric',
    IMPERIAL: 'Imperial'
  };

  ngOnInit(): void {
    const detected = this.region.refresh();
    this.api.getMyProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.isNew.set(false);
        this.auth.setProfileDisplayName(profile.displayName);
        this.form.patchValue({
          displayName: profile.displayName,
          heightCm: profile.heightCm,
          weightKg: profile.weightKg,
          dateOfBirth: profile.dateOfBirth ?? '',
          gender: profile.gender ?? 'MALE',
          fitnessGoal: profile.fitnessGoal ?? 'BUILD_MUSCLE',
          activityLevel: profile.activityLevel ?? 'MODERATE',
          preferredUnits: profile.preferredUnits ?? detected.suggestedUnits,
          timezone: profile.timezone ?? detected.timezone,
          region: profile.region ?? detected.region ?? '',
          onboardingCompleted: profile.onboardingCompleted
        });
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.isNew.set(true);
          const name = this.auth.displayName();
          this.form.patchValue({
            displayName: name || '',
            preferredUnits: detected.suggestedUnits,
            timezone: detected.timezone,
            region: detected.region ?? ''
          });
        } else {
          this.error.set('Could not load profile');
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.stopOtpAutofill();
    this.auth.clearPhoneAuth();
    this.revokeCropUrl();
  }

  label(value: string | null | undefined, map: Record<string, string>): string {
    if (!value) {
      return '-';
    }
    return map[value] ?? value;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.toast.error('Choose an image file');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      this.toast.error('Image must be under 8 MB');
      return;
    }
    this.revokeCropUrl();
    this.cropObjectUrl = URL.createObjectURL(file);
    this.cropSrc.set(this.cropObjectUrl);
  }

  cancelCrop(): void {
    this.cropSrc.set(null);
    this.revokeCropUrl();
  }

  async saveCroppedPhoto(blob: Blob): Promise<void> {
    this.photoBusy.set(true);
    try {
      await this.auth.updateProfilePhoto(blob);
      this.cropSrc.set(null);
      this.revokeCropUrl();
      this.toast.success('Profile photo updated');
    } catch (err: unknown) {
      this.toast.error(this.authMessage(err, 'Could not upload photo'));
    } finally {
      this.photoBusy.set(false);
    }
  }

  startEmailEdit(): void {
    this.editingEmail.set(true);
    this.emailMessage.set(null);
    this.emailError.set(null);
    this.emailForm.reset({ email: this.auth.email() ?? '' });
  }

  cancelEmailEdit(): void {
    this.editingEmail.set(false);
    this.emailMessage.set(null);
    this.emailError.set(null);
  }

  async submitEmailChange(): Promise<void> {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.emailBusy.set(true);
    this.emailError.set(null);
    this.emailMessage.set(null);
    try {
      await this.auth.requestEmailChange(this.emailForm.controls.email.value);
      this.emailMessage.set(
        'Check the new inbox and open the verification link. Your email updates only after you confirm.'
      );
      this.toast.success('Verification email sent');
    } catch (err: unknown) {
      this.emailError.set(this.authMessage(err, 'Could not start email change'));
    } finally {
      this.emailBusy.set(false);
    }
  }

  async refreshContact(): Promise<void> {
    try {
      await this.auth.reloadCurrentUser();
    } catch {
      this.toast.error('Could not refresh account');
    }
  }

  startPhoneEdit(): void {
    this.editingPhone.set(true);
    this.phoneStep.set('phone');
    this.phoneMessage.set(null);
    this.phoneError.set(null);
    this.otpSentTo.set(null);
    this.otpForm.reset({ code: '' });
    this.auth.clearPhoneAuth();
    this.stopOtpAutofill();
  }

  cancelPhoneEdit(): void {
    this.editingPhone.set(false);
    this.phoneStep.set('phone');
    this.phoneMessage.set(null);
    this.phoneError.set(null);
    this.otpSentTo.set(null);
    this.otpForm.reset({ code: '' });
    this.auth.clearPhoneAuth();
    this.stopOtpAutofill();
  }

  async sendPhoneCode(): Promise<void> {
    if (this.phoneForm.invalid) {
      this.phoneForm.markAllAsTouched();
      return;
    }
    this.phoneBusy.set(true);
    this.phoneError.set(null);
    this.phoneMessage.set(null);
    const e164 = this.toE164();
    try {
      await this.auth.sendPhoneUpdateOtp(e164, 'profile-recaptcha');
      this.otpSentTo.set(e164);
      this.phoneStep.set('otp');
      this.phoneMessage.set('Enter the SMS code. On mobile it may autofill.');
      this.startOtpAutofill();
    } catch (err: unknown) {
      this.auth.clearPhoneAuth();
      this.phoneError.set(this.authMessage(err, 'Could not send code'));
    } finally {
      this.phoneBusy.set(false);
    }
  }

  async verifyPhoneCode(): Promise<void> {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }
    this.phoneBusy.set(true);
    this.phoneError.set(null);
    try {
      this.stopOtpAutofill();
      await this.auth.confirmPhoneUpdate(this.otpForm.controls.code.value);
      this.editingPhone.set(false);
      this.phoneStep.set('phone');
      this.toast.success('Phone number updated');
    } catch (err: unknown) {
      this.phoneError.set(this.authMessage(err, 'Could not verify code'));
      this.startOtpAutofill();
    } finally {
      this.phoneBusy.set(false);
    }
  }

  async detectRegionFromTimezone(): Promise<void> {
    await this.applyDetectedRegion('timezone', () => Promise.resolve(this.region.refresh()));
  }

  async detectRegionFromLocation(): Promise<void> {
    await this.applyDetectedRegion('location', () => this.region.detectFromLocation());
  }

  deviceSyncLabel(): string {
    if (this.stepsPlatform.deviceSyncEnabled()) {
      return this.stepsPlatform.devicePermission() === 'unsupported'
        ? 'Enabled · awaits native bridge'
        : 'Enabled';
    }
    return 'Off';
  }

  wearableSyncLabel(): string {
    if (this.stepsPlatform.wearableSyncEnabled()) {
      return this.stepsPlatform.wearablePermission() === 'unsupported'
        ? 'Enabled · awaits native bridge'
        : 'Enabled';
    }
    return 'Off';
  }

  async toggleDeviceSync(): Promise<void> {
    if (this.syncBusy()) {
      return;
    }
    this.syncBusy.set('device');
    try {
      const next = !this.stepsPlatform.deviceSyncEnabled();
      const result = await this.stepsPlatform.setDeviceSyncEnabled(next);
      if (result === 'denied') {
        this.toast.error('Phone step access was denied');
      }
    } finally {
      this.syncBusy.set(null);
    }
  }

  async toggleWearableSync(): Promise<void> {
    if (this.syncBusy()) {
      return;
    }
    this.syncBusy.set('wearable');
    try {
      const next = !this.stepsPlatform.wearableSyncEnabled();
      const result = await this.stepsPlatform.setWearableSyncEnabled(next);
      if (result === 'denied') {
        this.toast.error('Wearable access was denied');
      }
    } finally {
      this.syncBusy.set(null);
    }
  }

  private async applyDetectedRegion(
    mode: 'timezone' | 'location',
    detect: () => Promise<{ timezone: string; region: string | null; suggestedUnits: 'METRIC' | 'IMPERIAL'; label: string }>
  ): Promise<void> {
    if (this.detecting()) {
      return;
    }
    this.detecting.set(mode);
    try {
      const detected = await detect();
      this.form.patchValue({
        timezone: detected.timezone,
        region: detected.region ?? '',
        preferredUnits: detected.suggestedUnits
      });

      if (this.isNew()) {
        return;
      }

      const raw = this.form.getRawValue();
      this.api
        .updateProfile({
          ...raw,
          timezone: detected.timezone,
          region: detected.region,
          dateOfBirth: raw.dateOfBirth || null
        })
        .subscribe({
          next: (profile) => {
            this.profile.set(profile);
          },
          error: () => this.toast.error('Could not save region')
        });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not detect region';
      this.toast.error(message);
    } finally {
      this.detecting.set(null);
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const body = {
      ...raw,
      timezone: raw.timezone || null,
      region: raw.region || null,
      dateOfBirth: raw.dateOfBirth || null
    };
    const creating = this.isNew();
    const req$ = creating
      ? this.api.createProfile(body)
      : this.api.updateProfile(body);

    req$.subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.isNew.set(false);
        this.saved.set(true);
        this.error.set(null);
        void this.auth.syncDisplayName(profile.displayName);
        this.toast.success(creating ? 'Profile created' : 'Profile updated');
        this.nutritionSync.syncAfterProfileSave(profile).subscribe();
      },
      error: () => {
        this.error.set('Could not save profile');
        this.toast.error('Could not save profile');
      }
    });
  }

  logout(): void {
    void this.auth.logout();
  }

  readonly genderOptions: AppSelectOption[] = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER', label: 'Other' },
    { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' }
  ];

  readonly goalOptions: AppSelectOption[] = [
    { value: 'LOSE_WEIGHT', label: 'Lose weight' },
    { value: 'BUILD_MUSCLE', label: 'Build muscle' },
    { value: 'STAY_FIT', label: 'Stay fit' },
    { value: 'ENDURANCE', label: 'Endurance' },
    { value: 'GENERAL_HEALTH', label: 'General health' }
  ];

  readonly activityOptions: AppSelectOption[] = [
    { value: 'SEDENTARY', label: 'Sedentary' },
    { value: 'LIGHT', label: 'Light' },
    { value: 'MODERATE', label: 'Moderate' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'VERY_ACTIVE', label: 'Very active' }
  ];

  readonly unitOptions: AppSelectOption[] = [
    { value: 'METRIC', label: 'Metric' },
    { value: 'IMPERIAL', label: 'Imperial' }
  ];

  private toE164(): string {
    const { countryCode, phone } = this.phoneForm.getRawValue();
    const digits = phone.replace(/\D/g, '');
    const cc = countryCode.trim().startsWith('+')
      ? countryCode.trim()
      : `+${countryCode.trim()}`;
    return `${cc}${digits}`;
  }

  private startOtpAutofill(): void {
    this.stopOtpAutofill();
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
        const code = (cred as { code?: string } | null)?.code;
        if (!code) {
          return;
        }
        this.otpForm.controls.code.setValue(code.replace(/\D/g, '').slice(0, 6));
        if (this.otpForm.valid) {
          void this.verifyPhoneCode();
        }
      })
      .catch(() => undefined);
  }

  private stopOtpAutofill(): void {
    this.otpAbort?.abort();
    this.otpAbort = null;
  }

  private revokeCropUrl(): void {
    if (this.cropObjectUrl) {
      URL.revokeObjectURL(this.cropObjectUrl);
      this.cropObjectUrl = null;
    }
  }

  private authMessage(err: unknown, fallback: string): string {
    const text =
      typeof err === 'object' && err && 'message' in err
        ? String((err as { message: string }).message)
        : '';
    if (/region enabled/i.test(text) || /SMS unable to be sent/i.test(text)) {
      return 'SMS is blocked for this country. In Firebase Console → Authentication → Settings → SMS region policy, allow your region (e.g. IN).';
    }
    if (typeof err === 'object' && err && 'code' in err) {
      const code = String((err as { code: string }).code);
      if (code.includes('requires-recent-login')) {
        return 'For security, sign out and sign back in, then try again.';
      }
      if (code.includes('email-already-in-use')) {
        return 'That email is already used by another account.';
      }
      if (code.includes('invalid-email')) {
        return 'Enter a valid email address.';
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
      if (code.includes('invalid-verification-code')) {
        return 'That code is incorrect. Try again.';
      }
      if (code.includes('credential-already-in-use')) {
        return 'That phone number is already linked to another account.';
      }
      if (code.includes('too-many-requests')) {
        return 'Too many attempts. Wait a moment and try again.';
      }
      if (code.includes('storage/unauthorized') || code.includes('unauthorized')) {
        return 'Photo upload is not allowed yet. Check Firebase Storage rules.';
      }
      return code.replace('auth/', '').replace('storage/', '').replaceAll('-', ' ');
    }
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallback;
  }

  private localDateKey(date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private shiftYears(iso: string, years: number): string {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y + years, m - 1, d);
    return this.localDateKey(date);
  }
}
