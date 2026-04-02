# Publishing Guide (Google Play First, Apple App Store Last)

This guide is written for your current Expo app (`jaymimicakes`) and assumes you want to publish:
1. First on **Google Play Store**
2. Then on **Apple App Store**

If by "lastly on play store" you meant something else, update this file accordingly.

## 1. Pre-Launch Preparation (Do This Once)

1. Finalize legal/business basics:
   - Terms and Conditions page
   - Privacy Policy page (public URL, not a PDF)
   - Refund/return policy for physical products
   - Support email and phone/WhatsApp contact
2. Confirm ecommerce flow is production-ready:
   - Product catalog and prices
   - Delivery areas and fees
   - Order status flow (placed -> processing -> delivered/cancelled)
   - Payment success/failure/refund flow
3. Prepare brand assets:
   - App icon (high quality)
   - Feature graphic/banner
   - Screenshots (phone sizes; tablet optional)
4. Choose production identifiers:
   - Android package name (example: `com.jaymimicakes.app`)
   - iOS bundle identifier (example: `com.jaymimicakes.app`)
5. Confirm backend production settings:
   - Production Supabase project and keys
   - Production webhook URLs
   - Production payment keys/secrets
   - Deep link return URL uses `jaymimicakes://payment-return`

## 2. Configure App Identifiers in Expo

Update [`app.json`](/c:/Users/chiku/Desktop/Projects/jaymimicakes/app.json) to include stable identifiers before first store upload:

```json
{
  "expo": {
    "name": "jaymimicakes",
    "slug": "jaymimicakes",
    "scheme": "jaymimicakes",
    "android": {
      "package": "com.jaymimicakes.app"
    },
    "ios": {
      "bundleIdentifier": "com.jaymimicakes.app",
      "supportsTablet": true
    }
  }
}
```

Important:
- Never change package/bundle identifiers after release unless you are creating a new app listing.

## 3. Set Up EAS (Build + Submit)

1. Install and login:
```bash
npm install -g eas-cli
eas login
```
2. Configure EAS in project root:
```bash
eas build:configure
```
3. Create/update `eas.json` profiles (example):
```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

## 4. Publish to Google Play Store (First)

### Step 4.1 Create Google Play Console account

1. Create/sign in with a Google account dedicated to the business.
2. Register Play Console and pay the one-time registration fee (US$25).
3. Complete identity and account verification in Play Console.

### Step 4.2 Create app in Play Console

1. Create new app entry (default language, app name, app/game, free/paid).
2. Fill store listing:
   - Short description
   - Full description
   - Screenshots
   - App icon and feature graphic
   - Contact details
   - Privacy policy URL

### Step 4.3 Complete policy forms (required)

In **Policy and programs > App content**, complete:
1. Privacy policy
2. Data safety form
3. Ads declaration
4. App access (if login required, provide test credentials/instructions)
5. Content rating questionnaire
6. Target audience and content
7. Any additional declarations shown for your app category/region

For apps with user accounts:
1. Provide an in-app account deletion path if account creation exists.
2. Complete data deletion questions in Data safety.

### Step 4.4 Payments policy for your ecommerce app (physical goods)

1. Your app sells physical products, so checkout can use your normal payment provider.
2. Do not sell digital-only consumables/features in-app without following platform billing rules.

### Step 4.5 Build Android release (AAB)

1. Build production bundle:
```bash
eas build --platform android --profile production
```
2. Let Expo/EAS manage signing credentials, or provide your own.
3. Ensure Play App Signing is enabled in Play Console.

### Step 4.6 Upload and test before production

1. Upload AAB to Internal testing first.
2. Add testers and validate:
   - Sign in/sign up
   - Catalog loading
   - Cart and checkout
   - Payment return/deep links
   - Delivery quote
   - Order status updates
3. Move to Closed testing.
4. If your developer account is a new Personal account, satisfy Play's closed testing requirement before production access.

### Step 4.7 Release to production

1. Create Production release in Play Console.
2. Use staged rollout (for example 10% -> 25% -> 50% -> 100%).
3. Monitor crashes/ANRs and order/payment errors.
4. Complete full rollout after stability checks.

## 5. Publish to Apple App Store (Last)

### Step 5.1 Enroll in Apple Developer Program

1. Enroll as Individual or Organization.
2. Pay annual membership fee (typically US$99/year).
3. Ensure App Store Connect access for release manager/admin.

### Step 5.2 Create app in App Store Connect

1. Create a new app record with:
   - App name
   - Bundle ID (must match `ios.bundleIdentifier`)
   - SKU
2. Set pricing and availability.

### Step 5.3 Prepare required App Store metadata

1. App description, keywords, support URL, marketing URL (optional)
2. Screenshots for required iPhone sizes
3. Privacy Policy URL (required)
4. App Privacy questionnaire (data collection/sharing details)
5. App Review information:
   - Demo/test account if login is required
   - Notes for reviewer
   - Contact details

### Step 5.4 Payments policy for physical goods

1. For physical goods/services consumed outside the app, Apple requires non-IAP payment methods.
2. Do not use Apple In-App Purchase for physical product checkout.

### Step 5.5 Build iOS release

1. Build production iOS binary:
```bash
eas build --platform ios --profile production
```
2. Let EAS manage certificates/profiles unless you need manual control.

### Step 5.6 Upload and test in TestFlight

1. Submit build to App Store Connect:
```bash
eas submit --platform ios --latest
```
2. Add internal testers first.
3. Add external testers when stable.
4. Validate full purchase and delivery flow end-to-end.

### Step 5.7 Submit for App Review and release

1. Attach the approved build to app version.
2. Click **Add for Review** then **Submit for Review**.
3. Respond quickly to reviewer questions or rejections.
4. Release manually or automatically after approval.

## 6. Final Launch Checklist (Both Stores)

1. Version numbers incremented correctly.
2. Privacy policy and support links working.
3. Account deletion path works (if accounts are created in-app).
4. Payment webhooks verified in production.
5. Crash reporting and analytics active.
6. Customer support playbook ready for first 2 weeks.
7. Rollback/hotfix plan prepared.

## 7. Useful Official References

- Expo EAS Build: https://docs.expo.dev/build/introduction/
- Expo EAS Submit: https://docs.expo.dev/submit/introduction/
- Android App Bundle requirement: https://developer.android.com/guide/app-bundle/
- Play Console setup: https://support.google.com/googleplay/android-developer/answer/6112435
- Play App Signing: https://support.google.com/googleplay/android-developer/answer/9842756
- Play Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Play testing tracks: https://support.google.com/googleplay/android-developer/answer/9845334
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Submit app in App Store Connect: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app
- App Store app privacy details: https://developer.apple.com/app-store/app-privacy-details/

