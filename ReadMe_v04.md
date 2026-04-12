# Mobile Store Submission Guide (v04)

This guide covers both:
- Google Play Store (Android)
- Apple App Store (iOS, without needing a physical Apple device)

Project identifiers currently set:
- Android package: `za.co.jaymmimicakes`
- iOS bundle identifier: `za.co.jaymmimicakes`

## 1. Pre-Submission Checklist

1. Confirm app metadata in `app.json`:
   - `expo.name`
   - `expo.version`
   - `expo.android.versionCode` (must increase for every Android release)
2. Prepare store assets:
   - App icon (1024x1024)
   - Screenshots (phone; tablet optional but recommended)
   - Feature graphic (Google Play)
3. Prepare legal links:
   - Privacy Policy URL (required)
   - Support email/contact
4. Confirm production backend keys and environment variables are ready.

## 2. Accounts You Need

1. Expo account (EAS builds)
2. Google Play Console account (one-time fee)
3. Apple Developer Program account (annual fee)

Note: You can submit iOS builds from Windows using EAS cloud. A Mac or physical iPhone is not required for building/submitting, but you still need an Apple Developer account.

## 3. Install and Login (once per machine)

```bash
npm install
npx eas login
npx eas project:init
```

Optional verification:

```bash
npx eas project:info
```

## 4. Build Android AAB for Play Store

1. Run production build:

```bash
npx eas build --platform android --profile production
```

2. Let EAS manage Android credentials when prompted (recommended).
3. Wait for build to finish and download/track the `.aab` from EAS build page.

## 5. Submit to Google Play Console

1. Create app in Play Console.
2. Complete Store Listing:
   - App name
   - Short description
   - Full description
   - Screenshots
   - Feature graphic
3. Complete App Content:
   - Privacy Policy
   - Data safety form
   - Content rating
   - Target audience
4. Create release:
   - Internal testing first (recommended)
   - Upload `.aab`
   - Add release notes
5. Roll out internal test, verify, then promote to production.

## 6. Build iOS IPA for App Store (No Apple Device Required)

1. Run production iOS build:

```bash
npx eas build --platform ios --profile production
```

2. Let EAS manage iOS credentials when prompted:
   - Distribution certificate
   - Provisioning profile
3. If prompted, provide Apple Developer login/app-specific steps.
4. EAS builds the `.ipa` in the cloud.

## 7. Submit to App Store Connect

1. Create app in App Store Connect with bundle ID `za.co.jaymmimicakes`.
2. Complete app information:
   - App name/subtitle
   - Description/keywords
   - Privacy Policy URL
   - Support URL
   - Screenshots
3. Upload build using EAS submit:

```bash
npx eas submit --platform ios --profile production
```

4. In App Store Connect:
   - Attach uploaded build to app version
   - Fill App Privacy questionnaire
   - Fill Export Compliance
   - Add release notes
   - Submit for Review

## 8. Versioning Rules Before Every Update

1. Increase `expo.version` for both stores (for example `1.0.1` -> `1.0.2`).
2. Increase `expo.android.versionCode` for Android (integer +1 each release).
3. For iOS, EAS remote versioning handles build numbers when configured with:
   - `eas.json` -> `"appVersionSource": "remote"`

## 9. Recommended First Release Strategy

1. Release Android to Internal Testing track first.
2. Fix issues from testers.
3. Submit iOS build to TestFlight.
4. After validation, move Android to production and submit iOS for App Review.

## 10. Useful Commands

```bash
# Validate expo config
npx expo config --type public

# Create or link EAS project
npx eas project:init

# Check current linked EAS project
npx eas project:info

# Android production build
npx eas build --platform android --profile production

# iOS production build
npx eas build --platform ios --profile production

# Submit Android
npx eas submit --platform android --profile production

# Submit iOS
npx eas submit --platform ios --profile production
```
