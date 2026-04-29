# Jay Cakes Release Runbook (Android)

Last updated: 2026-04-29

## Final App Identity
- App name: Jay Cakes
- Expo slug: jay-cakes
- Expo scheme: jaycakes
- Android package: za.co.jaycakes
- iOS bundle ID: za.co.jaycakes
- Expo owner: sulvid
- EAS project ID: 97d2c2bd-4083-4d0b-83ce-3855590c27a8
- Firebase project ID: jay-cakes
- Firebase Android App ID: 1:119743955607:android:f2435b11830d35edd55fd2

## Files and What They Mean
- app config: app.json
- EAS config: eas.json
- active Firebase config: google-services.json
- old Firebase config backup: google-services.OLD-PROJECT.json

## Build Result Already Generated
- EAS build logs: https://expo.dev/accounts/sulvid/projects/jay-cakes/builds/7cca881a-796f-4ad0-a24d-a1673b74bbe1
- AAB artifact: https://expo.dev/artifacts/eas/gpLnyt4D5RrEUMGiSx6Svg.aab

## Next Process Flow (Play Console Internal Testing)
1. Open Google Play Console and create/select app tied to package `za.co.jaycakes`.
2. Go to Testing -> Internal testing.
3. Create release.
4. Upload the AAB (or paste the EAS artifact URL in your notes for traceability).
5. Add release notes.
6. Save and roll out to Internal testing.
7. Add tester emails/group and copy opt-in link.
8. Install from opt-in link and validate login, notifications, payments, and deep links.

## Standard Commands For Future Releases
1. Build Android production:
   `eas build -p android --profile production`
2. Submit latest build to Play (when ready):
   `eas submit -p android --latest`

## Operational Notes
- `eas.json` uses remote app versioning and `autoIncrement`, so Play build versionCode is managed remotely by EAS.
- Keep `google-services.json` aligned with package `za.co.jaycakes`.
- Do not restore old config file (`google-services.OLD-PROJECT.json`) unless intentionally rolling back to the previous Firebase project.
