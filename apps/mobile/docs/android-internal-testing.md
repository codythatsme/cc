# Android internal testing readiness

Status: draft preparation, September 28, 2026. Local APK and simulator results are preliminary evidence; the final Play-installed build still needs its own acceptance pass. Unchecked items are pending, not confirmed bugs.

## Evidence already collected

- [x] Local ARM64 APK builds and runs with an embedded release bundle without Firebase or production signing.
- [x] Mobile typecheck, lint, and 311 tests pass (44 test files; September 28).
- [x] Android native screen captures cover logged-out, paired, settings, dialogs, errors, and light/dark states. iOS before/after captures document shared changes.
- [x] Android 17 / WebView 145 keyboard investigation reproduced double IME resizing, then verified its removal; Android 16 / WebView 133 was also checked. The Pixel 9 Pro user reported the interaction was much better.
- [x] Single insertion handle is hidden; caret and range-selection handles remain available in the verified Android build.
- [x] Table clipping reproduced in Android 17 WebView and fixed in served web CSS. Wide-table touch scrolling and desktop scrollbar behavior checked; 26 focused web tests pass.

The screenshot review and measurement logs are attached to the development thread. One Android paired-account screenshot uses the earlier Android 16 fixture run; local TLS-fixture trust on Android 17 remains unresolved. Do not count that as Android 17 connect coverage.

## Before inviting the first cohort

### Account and signing setup — account owner, with engineering support

- [ ] Create/confirm the Google Play Console app for `app.getbb.mobile`, account access, and any account-specific setup required by Console. Configure Play App Signing and an EAS Android upload keystore. Keep upload-key and Play app-signing certificates distinct.
- [ ] Build the production AAB with the intended version/versionCode, release signing, and `EXPO_PUBLIC_BB_E2E` unset. Confirm no Metro dependency, reset-on-launch behavior, or accessible developer/reset routes.
- [ ] Upload the first release manually in Play Console. After that, configure the Play publishing service account and `EXPO_TOKEN`, exercise the manual Android EAS workflow, and verify it creates an **internal draft**, not a released build. A preview APK is not a Play internal-testing release.
- [ ] Resolve Console's validation errors for the actual AAB, including native-library/device compatibility, required declarations, and any review/access instructions. Give testers a working bb connect account/server and clear pairing instructions.
- [ ] Create the tester email list/Google Group and opt-in link. Install from that link on an owner/test phone before inviting the broader group. Choose a support/feedback channel and write short release notes with known limitations.
- [ ] Check installation over any existing bb build. Our local APK uses a debug signing key and may require uninstalling/re-pairing before the Play build can install. Record this in tester instructions. Separately verify a Play-to-Play update preserves profiles, preferences, and drafts.

[Google Play testing tracks](https://support.google.com/googleplay/android-developer/answer/9845334), [Expo Android submission and first-upload requirements](https://docs.expo.dev/submit/android/).

### Push and HTTPS app links — account owner + engineering

- [ ] Decide whether the first cohort includes push. Firebase is not required for Play distribution. If push is deferred, explicitly label it unavailable and verify enabling notifications fails gracefully rather than appearing to succeed.
- [ ] If included: register `app.getbb.mobile` in Firebase, supply `GOOGLE_SERVICES_JSON` to the EAS build, configure FCM V1 credentials with Expo, and rebuild. Keep the Firebase app configuration, FCM sending credentials, and Play publishing credentials distinct.
- [ ] On a physical phone, test notification permission allow/deny/re-enable, per-server toggles, foreground/background/terminated delivery, and notification taps opening the correct thread/server. Verify revoked pairing and removed profiles stop receiving notifications.
- [ ] Register the **Play app-signing certificate's** SHA-256 fingerprint in the apex/connect gate's asset links. On the Play-installed build, test HTTPS thread and pairing links cold and warm, including a different saved server. Confirm unpaired/expired/revoked links recover sensibly. Scheme-link success alone does not verify HTTPS app links.

[Expo FCM credentials](https://docs.expo.dev/push-notifications/fcm-credentials/).

### Acceptance pass on the actual Play-installed build — engineering + a fresh tester

Record app version/code, Android version, WebView version, device, backend version, result, and evidence for each pass. Start with the Pixel 9 Pro on Android 17, an Android 16 device, and one additional OEM/device configuration. Include an older supported Android version before expanding the supported cohort.

- [ ] **Fresh install and pairing:** a tester with no prior bb app state can pair with a real HTTPS bb connect server by code and QR; handle invalid/expired codes, session renewal, revoked pairing, and switching among multiple account servers. Test direct LAN/Tailscale URL setup too. Verify profiles survive process death and reboot.
- [ ] **Core work:** open/create threads, select project/model, send/cancel/retry, respond to approvals and questions, stream a long response, and return to the correct thread after backgrounding. Never use a production command-executing server as an anonymous test fixture.
- [ ] **Keyboard and editing:** repeated focus/blur and Back dismissal on short/long threads; type/paste/select/copy, drag both selection handles, send, and retain drafts. Check Gboard and another keyboard, rotation, gesture/three-button navigation, and a hardware keyboard. No composer jump, double shrink, lost cursor, or input covered by the keyboard.
- [ ] **Reading and navigation:** long Markdown, wide tables and code, attachments, compact drawers, Android Back, external links, loading/offline/retry, renderer/process recovery, Wi-Fi↔cellular, and background/resume. Serve the updated web CSS when checking the table fix; installing a new APK alone does not deliver it.
- [ ] **Permissions and integrations:** real camera QR scanning, file/photo attachment, microphone/voice flow, share intents, and quick actions where supported. Denial and later permission changes must recover without crashes.
- [ ] **Native settings and accessibility:** light/dark/system themes, large font/display scaling, TalkBack labels/focus, touch targets, haptics, notification settings, server removal, and clear-data confirmation. Verify hiding the insertion handle does not make native URL/code inputs unusable.
- [ ] **iOS regression:** smoke pairing, settings, server status labels, notification sheets, composer/selection, and tables after the web change. Shared wording, grouped-row spacing, and Hugeicons rendering changed; keyboard-inset and native handle patches are Android-only. The last table CSS change was not rerun on iOS.

## Engineering work to finish or explicitly accept

- [ ] Review and land the draft PR; run CI against the current base and resolve any integration failures. Recheck the final artifact after subsequent changes, not just the earlier local APK.
- [ ] Review all four new dependency patches and their upgrade/removal plans. In particular, the WebView IME patch assumes every Android WebView uses `WebViewKeyboardFrame`; verify both the main shell and developer probe remain wrapped.
- [ ] Make the Android connect fixture repeatable on Android 17 (trusted CA/DNS and cookie behavior), without weakening release TLS validation. Until then, require real-HTTPS physical-device pairing/session evidence. The host-specific fixture does not prove account-wide cross-server cookies.
- [ ] Exercise the EAS workflow from a clean runner with configured credentials; verify Firebase file resolution, patch application, signing, and version increments. A local debug-signed APK does not prove this pipeline.
- [ ] Establish actionable crash/ANR and failed-pairing diagnostics, plus a report template that excludes tokens/cookies and includes device/WebView versions. Assign an owner to triage the first cohort's reports.

## Go / no-go

Invite the first small cohort only after the Play-installed build can install, pair, retain its session, send/read a thread, navigate Back, and repeatedly open/close the keyboard without crashes or layout jumps. Block on lost input, authentication/session failures, inaccessible core flows, or a signing/update failure. Push and verified HTTPS links may be deferred only as explicit, tested limitations with working alternatives.

Wider beta and public production approval are separate milestones. Do not treat production-only account/testing requirements as prerequisites for beginning internal testing; follow what the app's Play Console actually requires for the chosen track.
