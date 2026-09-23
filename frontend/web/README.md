# Web (Angular) + Ionic / Capacitor

Repwise / Workout Tracker frontend — Angular 19 standalone app, with **Ionic 9** and **Capacitor 8** for native iOS/Android shells.

## Development server (browser)

```bash
npm start
```

Uses `proxy.conf.json` to forward `/api` to the API gateway at `http://localhost:8080`.
Open `http://localhost:4200/`.

## Native (Capacitor)

Prerequisites: Android Studio (Windows/Mac) and/or Xcode (Mac only for iOS).

```bash
# One-time: after first build, platforms are added under android/ and ios/
npm run build
npx cap add android
npx cap add ios          # macOS + Xcode required

# Day-to-day: rebuild web assets and sync into native projects
npm run cap:sync

# Open IDE
npm run cap:android
npm run cap:ios
```

- App id: `com.repwise.app`
- Web assets: `dist/web/browser` (see `capacitor.config.ts`)
- Native helpers: `src/app/core/native-platform.service.ts`

Existing screens stay as-is; adopt `ion-*` components gradually. Live workout notifications on device will use `@capacitor/local-notifications` next.

## Auth (Firebase)

Configured in `src/environments/environment.ts`.

| Method | Behavior |
|--------|----------|
| Email + password | Verification email required; account locked at `/verify-email` until verified |
| Phone OTP | SMS code; mobile autofill when supported |
| Google | Popup sign-in |

**Firebase Console checklist**

1. Enable Email/Password, Google, and Phone providers.
2. **Authentication → Settings → SMS region policy** → Allow → add **IN** (and other regions as needed).
3. Blaze plan required for SMS.
4. Firebase Storage rules for profile avatars (`avatars/{uid}.jpg`) — see `docs/WORKOUT_TRACKER_ARCHITECTURE_README.md`.
5. Authorized domains include `localhost`.

## Profile

- Upload photo with pan/zoom cropper (auto-fit).
- Without a photo (and without Google photo), avatar shows first + last name initials.
- Email and phone are shown; updates require verification (email link / SMS OTP).

## Build (web / Vercel)

```bash
npm run build
```

Artifacts go under `dist/web/browser`.

## More detail

See [`docs/WORKOUT_TRACKER_ARCHITECTURE_README.md`](../../docs/WORKOUT_TRACKER_ARCHITECTURE_README.md) for architecture, Firebase setup, and service ports.
