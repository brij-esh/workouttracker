# Android Firebase / Google Sign-In setup

The phone app cannot use `signInWithPopup` (causes **missing initial state**).
Native Google Sign-In is used instead via `@capacitor-firebase/authentication`.

## One-time Firebase Console steps

1. Open [Firebase Console](https://console.firebase.google.com/) → project **workouttracker-d526e**
2. **Project settings → Your apps → Add app → Android**
   - Package name: `com.repwise.app`
   - App nickname: Repwise Android
3. Add this **SHA-1** (debug keystore used for local installs):

   ```
   B4:54:34:17:FE:29:FF:73:F7:1F:8C:49:40:02:09:28:0A:46:30:D8
   ```

4. Download **`google-services.json`** and place it at:

   `frontend/web/android/app/google-services.json`

5. **Authentication → Sign-in method** → ensure **Google** is enabled.
6. Rebuild / reinstall:

   ```bash
   cd frontend/web
   npm run build
   npx cap sync android
   ```

   Then Run in Android Studio (or install a new debug APK).

## Release builds

For Play Store / release APK, add the **release keystore SHA-1** in Firebase as well
(Project settings → your Android app → Add fingerprint).
