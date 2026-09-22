import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Auth,
  User,
  ConfirmationResult,
  RecaptchaVerifier,
  PhoneAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithPhoneNumber,
  sendEmailVerification,
  verifyBeforeUpdateEmail,
  updatePhoneNumber,
  updateProfile,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly app: FirebaseApp;
  private readonly auth: Auth;
  private readonly userSignal = signal<User | null>(null);
  private readonly readySignal = signal(false);
  private readonly profileDisplayNameSignal = signal<string | null>(null);
  private confirmation: ConfirmationResult | null = null;
  private phoneUpdateVerificationId: string | null = null;
  private recaptcha: RecaptchaVerifier | null = null;
  private recaptchaContainerId: string | null = null;

  readonly user = this.userSignal.asReadonly();
  readonly ready = this.readySignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.userSignal());
  /** Password accounts stay locked until the email is verified. */
  readonly isAccountLocked = computed(() => {
    const user = this.userSignal();
    return !!user && this.requiresEmailVerification(user);
  });
  readonly canAccessApp = computed(
    () => !!this.userSignal() && !this.isAccountLocked()
  );
  readonly photoUrl = computed(() => this.userSignal()?.photoURL ?? null);
  readonly displayName = computed(() => {
    const fromProfile = this.profileDisplayNameSignal()?.trim();
    if (fromProfile) {
      return fromProfile;
    }
    const user = this.userSignal();
    return (
      user?.displayName?.trim() ||
      user?.email?.split('@')[0] ||
      user?.phoneNumber ||
      'Athlete'
    );
  });
  readonly email = computed(() => this.userSignal()?.email ?? null);
  readonly emailVerified = computed(() => !!this.userSignal()?.emailVerified);
  readonly phoneNumber = computed(() => this.userSignal()?.phoneNumber ?? null);
  /** First + last name initials when no photo is available. */
  readonly initials = computed(() => this.initialsFromName(this.displayName()));

  /** Prefer the saved profile name for avatar initials across the app. */
  setProfileDisplayName(name: string | null | undefined): void {
    const trimmed = name?.trim() || null;
    this.profileDisplayNameSignal.set(trimmed);
  }

  async syncDisplayName(name: string): Promise<void> {
    const trimmed = name.trim();
    this.setProfileDisplayName(trimmed);
    const user = this.auth.currentUser ?? this.userSignal();
    if (!user || !trimmed || user.displayName === trimmed) {
      return;
    }
    await updateProfile(user, { displayName: trimmed });
    await this.syncCurrentUser();
  }

  initialsFromName(name: string): string {
    const cleaned = name
      .replace(/[^\p{L}\p{N}\s.'_-]/gu, ' ')
      .trim();
    if (!cleaned) {
      return '?';
    }

    let parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      parts = parts[0].split(/[._\-]+/).filter(Boolean);
    }

    if (parts.length >= 2) {
      const first = parts[0][0];
      const last = parts[parts.length - 1][0];
      return `${first}${last}`.toUpperCase();
    }

    return parts[0][0].toUpperCase();
  }
  constructor() {
    this.app = initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    onAuthStateChanged(this.auth, (user) => {
      this.userSignal.set(user);
      this.readySignal.set(true);
    });
  }

  requiresEmailVerification(user: User): boolean {
    const hasPassword = user.providerData.some((p) => p.providerId === 'password');
    return hasPassword && !user.emailVerified;
  }

  async loginEmail(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
    await this.syncCurrentUser();
  }

  async registerEmail(email: string, password: string): Promise<void> {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    await sendEmailVerification(cred.user);
    await this.syncCurrentUser();
  }

  async sendVerificationEmail(): Promise<void> {
    const user = this.requireUser();
    if (!this.requiresEmailVerification(user) && user.emailVerified) {
      return;
    }
    await sendEmailVerification(user);
  }

  /**
   * Sends a verification link to the new address.
   * Email only changes after the user confirms that link.
   */
  async requestEmailChange(newEmail: string): Promise<void> {
    const user = this.requireUser();
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) {
      throw new Error('Enter a valid email address.');
    }
    if (trimmed === (user.email ?? '').toLowerCase()) {
      throw new Error('That is already your current email.');
    }
    await verifyBeforeUpdateEmail(user, trimmed);
  }

  /**
   * Start OTP for linking/changing phone on the signed-in account.
   */
  async sendPhoneUpdateOtp(phoneE164: string, containerId = 'profile-recaptcha'): Promise<void> {
    const user = this.requireUser();
    if (phoneE164 === user.phoneNumber) {
      throw new Error('That is already your current phone number.');
    }
    this.clearPhoneAuth();
    this.ensureRecaptcha(containerId);
    if (!this.recaptcha) {
      throw new Error('reCAPTCHA is not ready');
    }
    const provider = new PhoneAuthProvider(this.auth);
    this.phoneUpdateVerificationId = await provider.verifyPhoneNumber(
      phoneE164,
      this.recaptcha
    );
  }

  async confirmPhoneUpdate(code: string): Promise<void> {
    const user = this.requireUser();
    if (!this.phoneUpdateVerificationId) {
      throw new Error('Request a code first');
    }
    const credential = PhoneAuthProvider.credential(
      this.phoneUpdateVerificationId,
      code.trim()
    );
    await updatePhoneNumber(user, credential);
    this.phoneUpdateVerificationId = null;
    await this.syncCurrentUser();
  }

  async updateProfilePhoto(blob: Blob): Promise<string> {
    const user = this.requireUser();
    const storage = getStorage(this.app);
    const storageRef = ref(storage, `avatars/${user.uid}.jpg`);
    await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
    const url = await getDownloadURL(storageRef);
    await updateProfile(user, { photoURL: url });
    await this.syncCurrentUser();
    return url;
  }

  /** Reload Firebase user (e.g. after clicking the verification link). */
  async reloadCurrentUser(): Promise<User | null> {
    const user = this.auth.currentUser;
    if (!user) {
      this.userSignal.set(null);
      return null;
    }
    await user.reload();
    return this.syncCurrentUser();
  }

  async loginGoogle(): Promise<void> {
    await signInWithPopup(this.auth, new GoogleAuthProvider());
    await this.syncCurrentUser();
  }

  /**
   * Ensure an invisible reCAPTCHA verifier exists for phone OTP.
   * Call once the container element is in the DOM.
   */
  ensureRecaptcha(containerId = 'recaptcha-container'): void {
    if (this.recaptcha && this.recaptchaContainerId === containerId) {
      return;
    }
    this.clearRecaptchaOnly();
    this.recaptcha = new RecaptchaVerifier(this.auth, containerId, {
      size: 'invisible'
    });
    this.recaptchaContainerId = containerId;
  }

  async sendPhoneOtp(phoneE164: string): Promise<void> {
    this.ensureRecaptcha();
    if (!this.recaptcha) {
      throw new Error('reCAPTCHA is not ready');
    }
    this.confirmation = await signInWithPhoneNumber(
      this.auth,
      phoneE164,
      this.recaptcha
    );
  }

  async verifyPhoneOtp(code: string): Promise<void> {
    if (!this.confirmation) {
      throw new Error('Request a code first');
    }
    await this.confirmation.confirm(code.trim());
    this.confirmation = null;
    await this.syncCurrentUser();
  }

  clearPhoneAuth(): void {
    this.confirmation = null;
    this.phoneUpdateVerificationId = null;
    this.clearRecaptchaOnly();
  }

  async logout(): Promise<void> {
    this.clearPhoneAuth();
    this.profileDisplayNameSignal.set(null);
    await signOut(this.auth);
    this.userSignal.set(null);
    await this.router.navigateByUrl('/login');
  }

  async idToken(): Promise<string | null> {
    const user = this.auth.currentUser ?? this.userSignal();
    if (!user || this.requiresEmailVerification(user)) {
      return null;
    }
    return user.getIdToken();
  }

  private clearRecaptchaOnly(): void {
    try {
      this.recaptcha?.clear();
    } catch {
      /* verifier may already be cleared */
    }
    this.recaptcha = null;
    this.recaptchaContainerId = null;
  }

  private requireUser(): User {
    const user = this.auth.currentUser ?? this.userSignal();
    if (!user) {
      throw new Error('Sign in first.');
    }
    return user;
  }

  private async syncCurrentUser(): Promise<User | null> {
    const user = this.auth.currentUser;
    this.userSignal.set(user);
    return user;
  }
}
