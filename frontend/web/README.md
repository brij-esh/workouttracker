# Web (Angular)

Repwise / Workout Tracker frontend — Angular 19 standalone app.

## Development server

```bash
npm start
```

Uses `proxy.conf.json` to forward `/api` to the API gateway at `http://localhost:8080`.
Open `http://localhost:4200/`.

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

## Build

```bash
ng build
```

Artifacts go under `dist/`.

## More detail

See [`docs/WORKOUT_TRACKER_ARCHITECTURE_README.md`](../../docs/WORKOUT_TRACKER_ARCHITECTURE_README.md) for architecture, Firebase setup, and service ports.
