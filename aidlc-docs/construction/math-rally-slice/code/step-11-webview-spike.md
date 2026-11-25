# Step 11: WebView spike findings

Branch `spike/math-rally-webview` (commit `6de37ae`, pushed, never merge). Spike code: `apps/mobile/lib/spike/math_rally_spike.dart`, launched when the app runs with `--dart-define=MR_SPIKE=true`. The embed build under `apps/mobile/assets/math_rally/` is the step 10 gate build, buildId `app-c70a5d2e5457`.

Status: the Android emulator part is done. The iPhone part needs the owner (see "iPhone steps" below).

## Plugin version

`flutter_inappwebview` 6.1.5 does not build for Android with the current Android Gradle Plugin:

> `getDefaultProguardFile('proguard-android.txt')` is no longer supported ... (`flutter_inappwebview_android-1.1.3/android/build.gradle` line 44)

Following the approved fallback order, the spike moved to **6.2.0-beta.3**. Every checklist item below passed on 6.2.0-beta.3. MR4 and MR5 should pin 6.2.0-beta.3 exactly, or the first stable 6.2.x once released, and re-run this checklist.

## Android emulator results

Device: AVD `turbo_pixel` (sdk gphone64 arm64), headless, software GPU. Frame rates on this emulator are not meaningful and were not used.

| Item | Result | Evidence |
|---|---|---|
| App-internal origin | Pass. Served from `https://appassets.androidplatform.net/assets/flutter_assets/assets/math_rally/index.html` through `WebViewAssetLoader` | log |
| Bridge round trip | Pass. `init` sent, `ready` received with protocolVersion 1 and buildId `app-c70a5d2e5457`; `pause`, `pauseChanged`, `raceFinished`, `error` all crossed the bridge | log |
| Hardening settings | Applied: file and content access off, universal and file-URL access off, mixed content never, third-party cookies off, geolocation off, zoom off, context menus off, link preview off, inspectable only in debug, permission requests denied, navigation limited to the app origin | spike code lines 175 to 222 |
| Enforced page policy | Pass. The only violation is the known Phaser `data:` probe on `img-src` (option B, accepted) | `violations-run1.json` |
| Loader statuses | Pass. `atlas.png` 200, `atlas.json` 200, `chime.wav` 200, missing file 404 | log |
| Build without `sys/white.png` | Pass. 404 for `white.png`, the game sends `error` `ENGINE_START_FAILED`, the app shows "The race could not load." with Back | `screens/step11-android-no-white.png` |
| Full Hard race | Pass. Finished with correct=3, timeMs=253966; `frames-run1.csv` (115 KB) and `violations-run1.json` written to the app documents folder | `screens/step11-android-finish.png` |
| First Back while racing | Pass. Pauses the game | `screens/step11-android-paused.png` |
| Second Back | Failed first, passed after a fix (see below). Leaves the screen | log, screenshots |
| Fault trigger | Pass. `error` `INTERNAL` after `ready`, overlay "The race stopped unexpectedly."; its Back returns to the menu | `screens/step11-android-fault.png` |
| Airplane mode | Pass. With the network off, the race loads and runs | `screens/step11-android-airplane.png` |
| Audio unlock | Pass at the platform level: with `mediaPlaybackRequiresUserGesture: false` an audio output stream opens right after `ready`. Audibility cannot be checked headless; the iPhone run covers it | log |
| Composition modes | Both render and take joystick input: hybrid composition (default) and texture layer (`--dart-define=MR_TEXTURE_LAYER=true`). Default stays hybrid; the frame-rate choice between them belongs to the Android stage before MR5 | `screens/step11-android-texture-layer.png` |

## Bug found: second Back froze the app

The first emulator run showed "dashden_mobile isn't responding" after the second Back (`screens/step11-android-anr-before-fix.png`).

Cause: the screen uses `PopScope(canPop: false)`. When `_onBack()` decided to leave, the handler called `Navigator.maybePop()`. `maybePop()` runs the `PopScope` callback again, which decides to leave again, which calls `maybePop()` again. The loop never yields a pop and blocks the UI thread.

Fix: call `Navigator.pop()`, which skips the `PopScope` check. After the fix, the second Back leaves at once and the overlay Back works. **MR4 and MR5 must use `pop()` in this path.** A widget test that presses Back twice should cover it.

## iPhone second session (Low Power Mode off, stored profile reset)

- Frame rate, one Hard race, `high` profile throughout: median 58.8 fps, slowest 1% 47.1 fps (frames sit at 16 to 17 ms, max 29 ms). This meets P-1 (median >= 50, 1% low >= 30) but is not a gate run: steering did not work (next point). WKWebView caps `requestAnimationFrame` at 60 Hz on this phone. Files in `spike-ios/session2-frames-run1.csv`.
- **Bug: no touch input in the `high` profile on a 2x or 3x screen.** The engine sets the canvas CSS size to 100% after Phaser boots, but Phaser keeps the display scale it measured at boot (canvas at backing-store size, up to 2x the CSS size). Every pointer maps to about half its real position, so touches never land in the joystick zone (bottom 40%). The `low` profile hid it: its 0.75 render scale triggers a resize that remeasures. Desktop checks ran at 1x with the keyboard, the emulator dropped to `low` early, and the first iPhone session ran in `low` because of Low Power Mode. Fix: `game.scale.refresh()` after sizing the canvas (`e7cf548`). Checked in headless Chromium at 390x844, 3x, with a joystick drag: without the fix the active lane stays at the left (chip x 193 of 1170); with it the kart moves right (chip x 974).
- **No way out on iPhone during a race.** There is no Back button and the screen blocks the swipe-back gesture. The spike only leaves through the Fault overlay. MR4 needs an exit on the pause screen (and the pause button must sit below the status bar; the owner could not see it, see next point).
- **Pause button hidden.** The HUD bar starts at y=0 under the status bar and Dynamic Island. MR4 must pad the HUD by the safe-area inset (or the host must lay the WebView out inside the safe area).

## Smaller notes

- The WebView requests `/favicon.ico`, which fails (`ERR_NAME_NOT_RESOLVED`, or `ERR_INTERNET_DISCONNECTED` offline). It is harmless. The embed page can ship an empty `favicon.ico` file to silence it; a `data:` icon would break the page policy.
- In the no-white-texture build, Phaser also throws `Cannot read properties of undefined (reading 'glTexture')` after the error message was sent. The user sees the right overlay. MR4 should stop the engine after sending `ENGINE_START_FAILED`.
- The 20 s `ready` timeout also fired in the no-white-texture run. The overlay text is the same, so the user sees no difference.
- iOS custom scheme `dashden-game://`: the plugin's handler has no status code field. A missing file returns null, which is what the iPhone run will check as the "missing file" case.

## iPhone results (2026-11-25, owner at the phone)

Device: iPhone, iOS 26.6.1, `flutter run --profile`. Spike branch at `25d76c2` plus two fixes needed before it ran:

- The spike branch lacked the iOS 15 minimum (`671954e` from the mobile branch); cherry-picked as `b954dbc`.
- `WebViewAssetLoader(AssetsPathHandler)` throws `UnimplementedError: createPlatformAssetsPathHandler` on iOS in 6.2.0-beta.3. It is now built on Android only (`25d76c2`). MR4 must do the same.

| Item | Result | Evidence |
|---|---|---|
| App-internal origin | Pass. Every file served through `dashden-game://app/` by the custom scheme handler (index, JS bundle, CSS, 3 system textures, atlas, 4 sounds) | log, `scheme 200` lines |
| Bridge round trip | Pass. `ready` with buildId `app-c70a5d2e5457` in 3 races | log |
| Enforced page policy | Pass. Only the accepted `data:` probe (`img-src`, source `dashden-game://app/assets/index-CFGAm9AU.js`) | `violations-run1.json` |
| Fault trigger | Pass. `error` `INTERNAL` twice, owner confirmed the overlay and Back | log, owner |
| Full Hard race | Pass. `frames-run1.csv` (4,483 frames) and `violations-run1.json` written at the finish, pulled with `xcrun devicectl` | files |
| Pause and Resume, airplane mode | Owner reported done | owner |
| Loader test | Found files: `status 0, no type` (the plugin answers with a plain `URLResponse`, not an HTTP response, so XHR sees status 0 and no content-type header; bodies are complete). Missing file: the plugin never finishes the request when the app answers null, and the XHR 5 s timeout does not fire either; it ended as a network error after 263 s, when the WebView was destroyed. **MR4 must answer every request** (a real body, or an error the plugin can deliver) and rely on the 20 s `ready` timeout for anything that hangs | log |
| Sound | Pass. Owner: the chime played | owner |
| Frame rate (informational, the gate runs are step 12) | Median 30.3 fps, 1% low 29.4 fps, quality profile `low` from the first frame (likely stored after an earlier race in the session ran at the same rate). Frame times sit flat at 33.0 ms with the 99th percentile at 34 ms. A flat 33 ms is a cap, not load: WebKit throttles `requestAnimationFrame` to 30 fps in Low Power Mode. Owner confirmed Low Power Mode was on. **Not a valid P-1 sample; rerun with Low Power Mode off and the stored profile cleared** | `frames-run1.csv` |

The Flutter log on iOS drops lines: the run's `raceFinished` and Violations lines never reached it, though the files prove the race finished. Step 12 relies on the saved files, not the log.

## iPhone steps (owner)

1. Connect the iPhone by cable, unlock it, keep Developer Mode on.
2. From `/Users/diego.tuleski/dev/dashden/.worktrees/math-rally-spike/apps/mobile` run:
   `flutter run -d 00008150-000A15522146401C --dart-define=MR_SPIKE=true`
3. Tap "Math Rally spike: Hard race" and check, in order:
   - The race appears and the kart steers with the joystick.
   - Tap "Loader test": the log shows the three files loaded and the missing file failing.
   - Tap "Violations": the log shows only the `data:` image entry.
   - Pause with the pause button, then Resume.
   - Tap "Fault": "The race stopped unexpectedly." appears, and Back returns to the menu.
   - Turn on airplane mode, start a race: it loads. Turn airplane mode off.
   - Sound: a chime plays with the ring/silent switch on ring. Flip to silent and note whether the chime still plays.
   - Finish one full race.
4. Pull the files:
   `xcrun devicectl device copy from --device 0E272228-575F-5FD4-B407-272B2A97E727 --domain-type appDataContainer --domain-identifier app.dashden.dashdenMobile --source Documents/math-rally-spike --destination /tmp/mr-ios`
   (If the bundle id differs, `xcrun devicectl device info apps --device 0E272228-575F-5FD4-B407-272B2A97E727 | grep -i dashden` shows it.)
