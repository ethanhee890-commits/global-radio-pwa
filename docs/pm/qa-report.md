---
type: qa-report
project: "GlobalRadioPWA"
status: active
last_updated: "2026-07-10"
tags:
  - qa
  - global-radio
  - japan-radio
---

# QA Report — 지구라디오 모바일 재생/검색 QA

## Scope

- 일본 우선 seed: NHK WORLD-JAPAN Radio, Shonan Beach FM 78.9, FM Kahoku 78.7
- 일본 빠른 진입 CTA, 일본 검증 안내, NHK/공개 FM quick filter
- Shonan Beach FM 공식 YouTube Live Cam visible iframe 대체 소스
- radiko 우회/비공식 NHK 미러 제외
- 국가가 전체일 때 일본 전용 장르가 노출되지 않도록 필터 옵션 관계 검증
- 직접 라디오 스트림이 양호한 상태에서는 YouTube 대체 플레이어를 상시 노출하지 않고, 낮은 품질 또는 실패 상태에서만 노출
- 직접 재생 실패 후 사용자가 YouTube 대체 소스를 선택하면 모바일 바텀시트 안에서 visible iframe을 단일 렌더링
- 모바일 카드에서 외부 방송국 파비콘을 직접 로드하지 않고 안정적인 이니셜 아바타를 사용해 외부 이미지 402/404/ORB 콘솔 오류 제거
- 런타임 YouTube 금지 패턴과 빌드 산출물 public asset 경로를 security scan에 추가

## Automated Checks

- `npm.cmd run verify`: PASS
  - lint: PASS
  - typecheck: PASS
  - vitest: 12 files / 41 tests PASS
  - build: PASS
  - security scan: PASS, includes runtime YouTube policy scan and built `dist` public asset path scan
- `npm.cmd audit --audit-level=moderate`: PASS, vulnerabilities 0

## Browser Checks

- URL: `http://127.0.0.1:5179/`
- In-app Browser check: NOT CHECKED in this pass
  - Browser bootstrap timed out after 120 seconds.
  - Fallback rendered QA used Playwright with system Chrome.
- Desktop 1280px Chrome check: PASS
  - App title and station cards render
  - Result heading: `168개 방송`
  - Horizontal overflow: none
  - Console warn/error after settled load: none
  - Request failures after settled load: none
- Mobile 360px Chrome check: PASS
  - App title and station cards render
  - Horizontal overflow: none
  - Bottom navigation widths equal: `79, 79, 79, 79`
  - Search input left/right padding equal
  - Search input and country filter do not overlap
  - Console warn/error: none
  - Request failures: none
- Mobile 390px Chrome check: PASS
  - App title and station cards render
  - Horizontal overflow: none
  - Bottom navigation widths equal: `86, 86, 86, 86`
  - Search input left/right padding equal
  - Search input and country filter do not overlap
  - `japan` query maps to Japan country filter
  - Choosing Spain after `japan` clears the conflicting query
  - All-country genre menu excludes Japan-only labels
  - YouTube fallback opens bottom sheet with exactly one visible iframe
  - Hidden iframe count: 0
  - Bottom sheet close button tap target: 40px × 40px
  - Closing the bottom sheet unmounts the YouTube iframe
  - Web alarm copy is scoped to web only
  - Console warn/error: none
  - Request failures: none

## Stream Checks

- NHK WORLD-JAPAN HLS playlist: HTTP 200, `application/vnd.apple.mpegurl`, 244 bytes
- Shonan Beach FM HTTPS MP3 stream: HTTP 200, `audio/mpeg`, data received for 8 seconds
- FM Kahoku HTTP MP3 stream: HTTP 200, `audio/mpeg`, data received for 8 seconds

## Playback Automation Note

- Browser automation click reached the app autoplay-blocked state for Shonan direct audio and showed the expected "tap again" warning.
- Because automated browser clicks may not grant the same audible media permission as a real user tap, direct audio canplay was verified by stream data receipt, not by audible playback in the automation session.

## Not Checked

- Current in-app browser rendered QA for this follow-up pass: connection/documentation bootstrap timed out after 120 seconds
- iOS Safari 실기기 direct audio playback
- 일본 내 radiko 앱/웹 권역 재생
- 장시간 스트림 안정성

## 2026-07-10 Follow-up QA

### Fixed

- 재생 실패 또는 재생 성공 상태가 검색 목록에만 반영되고, 같은 방송이 최근 들은 방송/즐겨찾기에 저장돼 있으면 저장 목록에는 이전 품질 상태가 남을 수 있는 문제를 수정했습니다.
- 직접 스트림 실패 후에는 저장 목록에서도 `lastcheckok: 0`으로 갱신되어 품질 배지가 `재생 실패`로 바뀌고, 검증된 공식 YouTube 대체 소스가 있는 경우 대체 버튼이 일관되게 노출됩니다.
- 이후 직접 재생이 성공하면 저장 목록도 `lastcheckok: 1`로 회복되어 오래된 실패 상태가 계속 남지 않도록 했습니다.

### Automated Checks

- `npm.cmd run test -- playbackState`: PASS, 4 tests
- `npm.cmd run verify`: PASS
  - lint: PASS
  - typecheck: PASS
  - vitest: 13 files / 45 tests PASS
  - build: PASS
  - security scan: PASS
- `npm.cmd audit --audit-level=moderate`: PASS, vulnerabilities 0

### Rendered Browser QA

- In-app Browser path: FAILED
  - Browser runtime connection timed out after 120 seconds and reset.
  - Fallback QA used Playwright with system Chrome.
- Desktop 1280px Chrome: PASS
  - App title renders as `지구라디오`
  - Station cards render
  - Horizontal overflow: none
  - Console warning/error: none
  - Request failures: none
- Mobile 360px Chrome: PASS
  - Station cards render
  - Bottom navigation widths equal: `79, 79, 79, 79`
  - Search input padding left/right equal: `16px / 16px`
  - Search input and country filter do not overlap
  - Horizontal overflow: none
  - Console warning/error: none
  - Request failures: none
- Mobile 390px Chrome: PASS
  - Station cards render
  - Bottom navigation widths equal: `86, 86, 86, 86`
  - Search input padding left/right equal: `16px / 16px`
  - Search input and country filter do not overlap
  - `japan` search maps to `Japan (JP)`
  - Changing country to Spain clears the conflicting `japan` query
  - `Lofi Girl Radio Demo` shows official YouTube alternate CTA
  - YouTube iframe is visible in the bottom sheet, 288px x 220px
  - Hidden YouTube iframe count: 0
  - Closing the bottom sheet unmounts the iframe
  - Horizontal overflow: none
  - Console warning/error: none

### Screenshots

- Mobile home: `C:\Users\rooki\AppData\Local\Temp\global-radio-qa\mobile-home-390.png`
- Visible YouTube iframe: `C:\Users\rooki\AppData\Local\Temp\global-radio-qa\mobile-youtube-iframe-visible-390.png`

## 2026-07-10 Playback Stall Follow-up

### Fixed

- 이전 방송이 재생 중인 상태에서 새 방송 스트림이 연결만 걸리고 실제 미디어 데이터를 받지 못하면, 오래된 `playing` 상태 때문에 실패 타임아웃이 건너뛰어질 수 있는 문제를 수정했습니다.
- 직접 스트림은 현재 오디오 요소의 `readyState`가 재생 가능한 데이터 단계에 도달했는지만 기준으로 멈춤 여부를 판단하도록 분리했습니다.
- 재생 버튼을 눌렀는데 소리가 나지 않고 연결이 오래 걸리는 경우, 일정 시간이 지나면 `연결 실패`와 `다시 시도하기` 상태로 명확히 바뀌도록 했습니다.

### Automated Checks

- `npm.cmd run test -- playbackState`: PASS, 5 tests
- `npm.cmd run verify`: PASS
  - lint: PASS
  - typecheck: PASS
  - vitest: 13 files / 46 tests PASS
  - build: PASS
  - security scan: PASS
- `npm.cmd audit --audit-level=moderate`: PASS, vulnerabilities 0

### Rendered Browser QA

- Mobile 390px Chrome via Playwright/system Chrome: PASS
  - Station cards render: 168 cards
  - Horizontal overflow: none
  - Search input padding left/right equal: `16px / 16px`
  - Search input and country filter do not overlap
  - Bottom navigation widths equal: `86, 86, 86, 86`
  - Console warning/error: none
  - Request failures: none

### Not Checked

- iOS Safari 실기기 direct audio playback
- 장시간 스트림 안정성
- 실사용 환경의 블루투스/무음 모드/기기 볼륨 상태

## 2026-07-10 Rapid Playback Switch Follow-up

### Fixed

- 첫 번째 방송의 `audio.play()` 결과가 늦게 실패한 뒤, 이미 사용자가 두 번째 방송을 선택했는데도 이전 실패가 현재 플레이어 상태를 `다시 시도하기` 또는 `브라우저 정책상 재생 버튼을 한 번 더 눌러주세요`로 덮어쓸 수 있는 비동기 경합을 수정했습니다.
- 직접 재생, 일시정지, YouTube 전환마다 현재 재생 시도 번호를 갱신하고, 오래된 시도의 성공/실패/타임아웃은 현재 UI 상태를 변경하지 못하도록 했습니다.

### Automated Checks

- `npm.cmd run test -- playbackState`: PASS, 6 tests
- `npm.cmd run verify`: PASS
  - lint: PASS
  - typecheck: PASS
  - vitest: 13 files / 47 tests PASS
  - build: PASS
  - security scan: PASS
- `npm.cmd audit --audit-level=moderate`: PASS, vulnerabilities 0
- `npm.cmd run android:debug`: PASS, debug APK build successful

### Rendered Browser QA

- In-app Browser path: FAILED
  - Browser runtime connection timed out after 120 seconds and reset.
  - Fallback QA used Playwright with system Chrome.
- Mobile 390px Chrome via Playwright/system Chrome: PASS
  - Flow: first station play click -> second station play click -> first play rejects later with `AbortError`
  - Current selected station remains `NHK WORLD-JAPAN Radio`
  - Player remains in `연결 중` for the current station
  - Stale autoplay warning: none
  - Stale connection failure: none
  - Horizontal overflow: none
  - Bottom navigation widths equal: `86, 86, 86, 86`
  - Search input padding left/right equal: `16px / 16px`
  - Console warning/error: none
  - Request failures: none

### Not Checked

- Real-device rapid switching while audio output is connected to Bluetooth or AirPlay

## 2026-07-10 Storage Failure Follow-up

### Fixed

- 브라우저 또는 WebView에서 `localStorage.setItem`이 저장공간 제한, 비공개 모드, 보안 정책 등으로 실패하면 즐겨찾기/최근/설정 저장 중 앱이 런타임 오류로 멈출 수 있는 문제를 수정했습니다.
- 저장소 쓰기 실패는 앱 조작을 막지 않도록 흡수하고, 메모리 상태는 유지해 사용자가 현재 세션에서 저장/해제/설정 조작을 계속할 수 있게 했습니다.

### Automated Checks

- `npm.cmd run test -- globalRadioStorage`: PASS, 1 test
- `npm.cmd run verify`: PASS
  - lint: PASS
  - typecheck: PASS
  - vitest: 14 files / 48 tests PASS
  - build: PASS
  - security scan: PASS
- `npm.cmd audit --audit-level=moderate`: PASS, vulnerabilities 0
- `npm.cmd run android:debug`: PASS, debug APK build successful

### Rendered Browser QA

- In-app Browser path: FAILED
  - Browser runtime connection timed out after 120 seconds and reset.
  - Fallback QA used Playwright with system Chrome.
- Mobile 390px Chrome via Playwright/system Chrome: PASS
  - Flow: app load -> force `localStorage.setItem` to throw `QuotaExceededError` -> tap first station favorite button
  - Favorite button changes to `저장됨`
  - Page errors: none
  - Console warning/error: none
  - Framework error overlay: none
  - Horizontal overflow: none
  - Bottom navigation widths equal: `86, 86, 86, 86`
  - Search input padding left/right equal: `16px / 16px`

### Not Checked

- Long-term persistence when the browser permanently denies storage writes; current session remains usable, but denied storage cannot be persisted by design.

## 2026-07-10 Android Alarm Scheduling Follow-up

### Fixed

- Android에서 정확한 알람 권한이 없거나 네이티브 자동 재생 알람 예약이 실패했는데도, 그 전에 로컬 알림이 먼저 예약되어 앱은 `알람 꺼짐`으로 보이지만 나중에 알림이 울릴 수 있는 상태 불일치를 수정했습니다.
- 기존 로컬 알림은 먼저 취소하되, Android에서는 네이티브 자동 재생 알람 예약이 성공한 뒤에만 동반 로컬 알림을 예약하도록 순서를 조정했습니다.
- iOS는 기존 의도대로 자동 재생 없이 로컬 알림만 예약하는 흐름을 유지했습니다.

### Automated Checks

- `npm.cmd run test -- nativeRadio`: PASS, 3 tests
- `npm.cmd run verify`: PASS
  - lint, typecheck, Vitest, production build, security scan all passed
  - Vitest suite: 15 files / 51 tests
- `npm.cmd run android:debug`: PASS, debug APK build completed with latest web assets
- `npm.cmd audit --audit-level=moderate`: PASS, 0 vulnerabilities
- `npm.cmd run android:debug`: PASS, debug APK build completed

### Rendered Browser QA

- In-app Browser path: FAILED
  - Browser runtime connection timed out after 120 seconds and reset.
  - Fallback QA used Playwright with system Chrome.
- Mobile 390px Chrome via Playwright/system Chrome: PASS
  - Flow: app load -> open Settings tab -> inspect radio alarm panel
  - Web-scoped alarm copy is shown
  - Web alarm button is disabled as expected
  - Hour/minute inputs remain visible on one row
  - Horizontal overflow: none
  - Bottom navigation widths equal: `86, 86, 86, 86`
  - Console warning/error: none
  - Page errors: none

### Not Checked

- Real Android exact alarm permission screen behavior on a physical device
- Real scheduled alarm playback at wall-clock time on Android

## 2026-07-10 Continued Mobile QA

### Fixed

- Saved and recent tabs no longer render the in-page radio player and station detail panel. Current playback remains available through the bottom mini player and bottom sheet, avoiding duplicate playback information on list-only tabs.
- When a user chooses an official YouTube alternate source, the bottom sheet now places the visible YouTube player at the top of the sheet instead of burying it below radio details.
- Removed the redundant YouTube success toast that appeared behind the bottom sheet and visually competed with the sheet content.

### Automated Checks

- `npm.cmd run verify`: PASS
  - lint, typecheck, Vitest, production build, security scan all passed
  - Vitest suite: 15 files / 51 tests

### Rendered Browser QA

- In-app Browser path: FAILED
  - Browser runtime connection timed out after 120 seconds and reset.
  - Fallback QA used Playwright with system Chrome.
- Mobile 360px and 390px Chrome via Playwright/system Chrome: PASS
  - Home page identity: `지구라디오`
  - Horizontal overflow: none
  - Bottom navigation widths equal at both mobile widths
  - Search input, search button, and country filter do not overlap
  - Query `japan` maps to Japan country filter and returns Japan stations
  - Changing country to Spain clears the conflicting `japan` query and returns Spain stations
  - Saved tab in-page `direct-player`: absent
  - Saved tab in-page `station-detail`: absent
- Bottom sheet QA at 390px: PASS
  - Mini player opens the bottom sheet
  - Close button is fully visible at 40px x 40px
  - Sheet body is scrollable
  - Dimmed backdrop tap closes the sheet
  - Close button closes the sheet
  - Horizontal overflow: none
- YouTube alternate QA at 390px: PASS
  - Before user YouTube action: iframe count 0
  - After user action: exactly one visible YouTube iframe, 322px x 220px, in viewport
  - Hidden YouTube iframe count: 0
  - Closing the sheet unmounts the iframe
  - Console warning/error: none
  - Page errors: none

### Evidence

- `C:\Users\rooki\AppData\Local\Temp\global-radio-qa-continuation\home-360.png`
- `C:\Users\rooki\AppData\Local\Temp\global-radio-qa-continuation\home-390.png`
- `C:\Users\rooki\AppData\Local\Temp\global-radio-qa-continuation\bottom-sheet-open-390.png`
- `C:\Users\rooki\AppData\Local\Temp\global-radio-qa-continuation\youtube-visible-390.png`

### Not Checked

- iOS Safari physical-device direct stream playback
- Android/iOS native package smoke test after this web-layer patch
- Long-running stream stability across multiple stations

## 2026-07-10 Stateful Mobile QA Follow-up

### Fixed

- Web alarm helper copy now stays scoped to the web environment. It no longer mixes Android and iOS instructions into the web settings screen.
- Saved and recent tabs now render their local lists immediately even while the discover station search is loading. The search loading skeleton and spinner are limited to the Home/discover results list.

### Automated Checks

- `npm.cmd run test -- globalRadioAlarmSettings`: PASS, 1 file / 3 tests
- `npm.cmd run verify`: PASS
  - lint: PASS
  - typecheck: PASS
  - Vitest: PASS, 15 files / 51 tests
  - production build: PASS
  - security scan: PASS
- `npm.cmd run android:debug`: PASS, debug APK build completed with latest web assets

### Rendered Browser QA

- In-app Browser path: FAILED
  - Browser runtime connection previously timed out after 120 seconds and reset.
  - Fallback QA used Playwright with system Chrome.
- Mobile 390px and 360px Chrome via Playwright/system Chrome: PASS
  - Page identity: `지구라디오`
  - Framework error overlay: none
  - Console warning/error: none
  - Page errors: none
  - Unexpected failed requests: none
  - Horizontal overflow: none at 390px and 360px
  - Bottom navigation widths equal at 390px and 360px
  - Saved tab does not show in-page direct player or station detail panel
  - Saved tab seeded favorite renders while discover search can still be loading
  - Saved tab `전체 삭제` empties UI and `global-radio-pwa:favorites:v1`
  - Recent tab does not show in-page direct player or station detail panel
  - Recent tab individual delete empties UI and `global-radio-pwa:recent:v1`
  - Recent tab `전체 삭제` empties UI and `global-radio-pwa:recent:v1`
  - Web alarm copy does not mention Android or iOS
  - Alarm hour/minute input values `03` and `07` normalize to `3` and `7`
  - Global genre options do not expose Japan-only values
  - Japan country selection exposes Japan-only genre options: `일본 추천`, `공개 FM`, `NHK/뉴스`

### Evidence

- `C:\Users\rooki\AppData\Local\Temp\global-radio-qa-continuation-3\saved-seeded-390.png`
- `C:\Users\rooki\AppData\Local\Temp\global-radio-qa-continuation-3\recent-seeded-390.png`
- `C:\Users\rooki\AppData\Local\Temp\global-radio-qa-continuation-3\settings-390.png`
- `C:\Users\rooki\AppData\Local\Temp\global-radio-qa-continuation-3\home-filters-390.png`
- `C:\Users\rooki\AppData\Local\Temp\global-radio-qa-continuation-3\home-filters-360.png`

### Not Checked

- iOS Safari physical-device direct stream playback
- Android/iOS native app smoke test on physical devices after this web-layer patch
- Real Android exact alarm permission screen behavior
- Real scheduled alarm playback at wall-clock time on Android
- Long-running stream stability across multiple stations

## 2026-07-10 Android Native QA Follow-up

### Fixed

- Android exact alarm scheduling no longer leaves native `SharedPreferences` with `enabled=true` when exact alarm permission is unavailable or native scheduling fails. Failed scheduling now clears the native alarm state so later `getAlarm()`, boot recovery, and receiver behavior do not report or restore a stale alarm.
- Android radio playback now retains and abandons the audio focus listener on pre-Android 8 devices as well as Android 8+. This prevents old audio-focus listeners from remaining registered after pause/stop on the supported `minSdkVersion 24` range.
- Native stop now clears the cached current title and subtitle with the stream URL, so `getStatus()` cannot expose stale station metadata after playback is stopped.

### Automated Checks

- Android execution environment check:
  - `adb` is not on PATH, but SDK adb exists at `D:\Projects\CodexProjects\_global-sdk\Android\Sdk\platform-tools\adb.exe` and `C:\Users\rooki\AppData\Local\Android\Sdk\platform-tools\adb.exe`
  - `adb devices`: PASS command execution, but no connected device/emulator was available
  - emulator binary/package: not available in the current SDK
- `$env:JAVA_HOME='D:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:compileDebugJavaWithJavac --console=plain`: PASS
- `$env:JAVA_HOME='D:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:testDebugUnitTest --console=plain`: PASS
- `$env:JAVA_HOME='D:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:lintDebug --console=plain`: PASS
  - `lint-results-debug.xml` contained no `<issue>` entries
- `npm.cmd run verify`: PASS
  - lint, typecheck, Vitest, production build, and security scan all passed
- `npm.cmd audit --audit-level=moderate`: PASS, 0 vulnerabilities
- `npm.cmd run android:debug`: PASS, debug APK build completed with latest native code

### Evidence

- Latest local debug APK: `release\global-radio-android-2026-07-10-qa4\jigu-radio-debug-2026-07-10-qa4.apk`
- Latest local debug ZIP: `release\global-radio-android-2026-07-10-qa4\jigu-radio-debug-2026-07-10-qa4.zip`
- APK SHA-256: `10D391BA2F8D81C5EAF348DAE46F1C324D1C2A9A9715246D113E7D479E7B8C95`

### Not Checked

- Android emulator or physical-device install/launch smoke test, because no device/emulator was connected and the SDK does not currently include the emulator package
- Real Android exact alarm permission screen behavior
- Real scheduled alarm playback at wall-clock time on Android
- iOS Safari physical-device direct stream playback
- iOS native archive/signing and physical-device smoke test
- Long-running stream stability across multiple stations

## 2026-07-10 Android Native QA Follow-up 2

### Fixed

- Android alarm recovery now validates the stored stream URL before scheduling. If stored alarm data is corrupted, empty, or not `http/https`, native alarm state is cleared instead of scheduling a no-op alarm.
- Android alarm receiver now clears invalid stored alarm data when it fires with an unusable stream URL.
- Android playback notification now uses the dedicated monochrome `ic_stat_radio` drawable for the small notification icon and action icons instead of the launcher icon. This avoids poor or blank status-bar rendering on Android notification surfaces.

### Automated Checks

- `$env:JAVA_HOME='D:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:compileDebugJavaWithJavac --console=plain`: PASS
- `$env:JAVA_HOME='D:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:testDebugUnitTest --console=plain`: PASS
- `$env:JAVA_HOME='D:\Program Files\Android\Android Studio\jbr'; .\gradlew.bat :app:lintDebug --console=plain`: PASS
  - `lint-results-debug.xml` contained 0 `<issue>` entries
- `npm.cmd run verify`: PASS
  - lint, typecheck, Vitest, production build, and security scan all passed
- `npm.cmd audit --audit-level=moderate`: PASS, 0 vulnerabilities
- `npm.cmd run android:debug`: PASS, debug APK build completed with latest native code

### Evidence

- Latest local debug APK: `release\global-radio-android-2026-07-10-qa5\jigu-radio-debug-2026-07-10-qa5.apk`
- Latest local debug ZIP: `release\global-radio-android-2026-07-10-qa5\jigu-radio-debug-2026-07-10-qa5.zip`
- APK SHA-256: `89A537B0AE7FE254042EC6AC7285CF82C7045982B2407174072BABB2DA5915EC`

### Not Checked

- Android emulator or physical-device install/launch smoke test, because no device/emulator was connected and the SDK does not currently include the emulator package
- Real Android notification tray rendering of the updated `ic_stat_radio` icon
- Real Android exact alarm permission screen behavior
- Real scheduled alarm playback at wall-clock time on Android
- iOS Safari physical-device direct stream playback
- iOS native archive/signing and physical-device smoke test
- Long-running stream stability across multiple stations

## 2026-07-10 PWA Manifest and Copy QA Follow-up

### Fixed

- Legacy `public/manifest.webmanifest` now uses relative `start_url`, `scope`, and icon paths. This matches `public-radio/manifest.webmanifest` and prevents root-path icon/install breakage when the app is served from a GitHub Pages subdirectory.
- Package metadata and design copydeck now avoid the user-facing term "소스" and use "좋은 음질의 채널", "다른 재생 방법", and "공식 YouTube 방송" instead.
- `publicAssets` regression coverage now checks both `public/manifest.webmanifest` and `public-radio/manifest.webmanifest`, so root-path manifest regressions are caught by automated tests.

### Automated Checks

- UTF-8 suspicious character scan across source/docs/config text files: PASS, 0 suspicious replacement or CJK compatibility mojibake characters
- `npm.cmd run verify`: PASS
  - lint: PASS
  - typecheck: PASS
  - Vitest: PASS, 15 files / 51 tests
  - production build: PASS
  - security scan: PASS
- `npm.cmd audit --audit-level=moderate`: PASS, 0 vulnerabilities
- `npm.cmd run android:debug`: PASS, debug APK build completed with latest web assets

### Rendered Browser QA

- In-app Browser path: BLOCKED
  - Browser runtime connected, but local `127.0.0.1:5179` navigation/reload was blocked by the Browser URL policy.
  - No alternate browser workaround was used after that policy block.

### Evidence

- Latest local debug APK: `release\global-radio-android-2026-07-10-qa6\jigu-radio-debug-2026-07-10-qa6.apk`
- Latest local debug ZIP: `release\global-radio-android-2026-07-10-qa6\jigu-radio-debug-2026-07-10-qa6.zip`
- APK SHA-256: `89A537B0AE7FE254042EC6AC7285CF82C7045982B2407174072BABB2DA5915EC`

### Not Checked

- 360px/390px rendered mobile screenshots for this exact patch, because Browser URL policy blocked local app navigation/reload and no workaround was used
- Android emulator or physical-device install/launch smoke test, because no device/emulator was connected
- Real Android notification tray rendering
- Real Android exact alarm permission screen behavior
- Real scheduled alarm playback at wall-clock time on Android
- iOS Safari physical-device direct stream playback
- iOS native archive/signing and physical-device smoke test
- Long-running stream stability across multiple stations

## 2026-07-10 Radio Browser Broken Stream QA Follow-up

### Fixed

- Radio Browser station search now sends `hidebroken=true`. Known broken stations are excluded at the API query layer before the app applies its local quality score, reducing cases where a visually high-scoring station still fails immediately because the directory already marked it broken.
- The Radio Browser metadata regression test now asserts `hidebroken=true` in generated search URLs.
- `security:scan` now checks both `public/manifest.webmanifest` and `public-radio/manifest.webmanifest`, plus the `public` runtime asset tree, so root-relative PWA manifest regressions cannot hide outside the production `public-radio` folder.

### Automated Checks

- Targeted Vitest:
  - `src/test/radioBrowserMetadata.test.ts`: PASS
  - `src/test/qualityScore.test.ts`: PASS
  - `src/test/playbackSource.test.ts`: PASS
  - `src/test/publicAssets.test.ts`: PASS
- `npm.cmd run verify`: PASS
  - lint: PASS
  - typecheck: PASS
  - Vitest: PASS, 15 files / 51 tests
  - production build: PASS
  - security scan: PASS
- `npm.cmd audit --audit-level=moderate`: PASS, 0 vulnerabilities
- `npm.cmd run android:debug`: PASS, debug APK build completed with latest web assets

### Evidence

- Latest local debug APK: `release\global-radio-android-2026-07-10-qa7\jigu-radio-debug-2026-07-10-qa7.apk`
- Latest local debug ZIP: `release\global-radio-android-2026-07-10-qa7\jigu-radio-debug-2026-07-10-qa7.zip`
- APK SHA-256: `468138CCAB7F43228D8234D8D8412D1EE463CF4BADD6BC450A5660DC6ECC8855`

### Not Checked

- 360px/390px rendered mobile screenshots for this exact patch, because Browser URL policy blocked local app navigation/reload and no workaround was used
- Live Radio Browser production sample success rate after the `hidebroken=true` query change
- Android emulator or physical-device install/launch smoke test, because no device/emulator was connected
- Real Android notification tray rendering
- Real Android exact alarm permission screen behavior
- Real scheduled alarm playback at wall-clock time on Android
- iOS Safari physical-device direct stream playback
- iOS native archive/signing and physical-device smoke test
- Long-running stream stability across multiple stations

## 2026-07-10 Mobile Render QA Follow-up

### Fixed

- The discover result count no longer says `0개 방송` while the first station request is still loading. It now shows `검색 중` until a real empty result or station list is available.
- Added regression coverage for the result-count label so loading and true empty states stay distinct.

### Rendered Browser QA

- Public URL checked: `https://ethanhee890-commits.github.io/global-radio-pwa/`
- Browser path: PASS on public deployment URL
- 390px viewport:
  - Page title: `지구라디오`
  - Horizontal overflow: PASS, `scrollWidth` equals `clientWidth`
  - Search input, search button, country/language/genre/sort controls: PASS, no overlap
  - Bottom navigation button widths: visually consistent
  - Console warnings/errors: PASS, none captured
- 360px viewport:
  - Horizontal overflow: PASS, `scrollWidth` equals `clientWidth`
  - Search input and country filter overlap: PASS, no overlap
  - Bottom navigation button widths: PASS, all four buttons measured `74.75px`
  - Console warnings/errors: PASS, none captured
- 360px `japan` search interaction:
  - Search input accepted `japan`
  - Country filter auto-aligned to `Japan (JP) · 203`
  - Language and genre remained `전체`
  - Result cards showed Japan stations
  - Horizontal overflow: PASS
  - Search/country overlap: PASS, no overlap

### Automated Checks

- `npm.cmd run test -- globalRadioFilterInference filterBarOptions globalRadioCssRegression`: PASS, 4 files / 14 tests
- `npm.cmd run verify`: PASS
  - lint: PASS
  - typecheck: PASS
  - Vitest: PASS, 15 files / 52 tests
  - production build: PASS
  - security scan: PASS
- `npm.cmd audit --audit-level=moderate`: PASS, 0 vulnerabilities
- `npm.cmd run android:debug`: PASS after isolating `GRADLE_USER_HOME` to a local `.gradle-user-home` cache. The first Android attempt failed because the shared Gradle cache at `D:\Projects\CodexProjects\_global-data\.gradle` had unreadable transform metadata, not because of source code.

### Evidence

- Latest local debug APK: `release\global-radio-android-2026-07-10-qa8\jigu-radio-debug-2026-07-10-qa8.apk`
- Latest local debug ZIP: `release\global-radio-android-2026-07-10-qa8\jigu-radio-debug-2026-07-10-qa8.zip`
- APK SHA-256: `7A96642FB98D65F7B017772E60F3574959E6CA355F6516890E3A1AF1A1E887B3`
- ZIP SHA-256: `A247E0543138D6922A96B0093DC420F5AC7D427AC6127C69415925B8F63E91E8`

### Not Checked

- Real direct-stream audio success rate on physical Android/iOS devices
- Real Android exact alarm behavior at wall-clock time
- iOS native archive/signing and physical-device smoke test
- Long-running stream stability across multiple stations

## 2026-07-10 YouTube Fallback Source QA Follow-up

### Finding

- Public mobile QA에서 `Lofi Girl Radio Demo`의 공식 YouTube 대체 소스가 visible iframe으로 열리기는 했지만, 기존 영상 ID `jfKfPfyJRdk`가 YouTube iframe 안에서 `실시간 스트림 녹화를 볼 수 없습니다.` 상태를 표시했습니다.
- 이 문제는 hidden player나 오디오 추출 문제가 아니라, 검증 seed가 현재 사용할 수 없는 오래된 라이브 영상 ID를 가리키고 있던 데이터 오류입니다.

### Fixed

- Lofi Girl 공식 대체 소스를 2026-07-10 기준 공식 채널 `@LofiGirl`의 현재 라이브 영상 ID `X4VbdwhkE10`으로 교체했습니다.
- YouTube embed URL에 가능한 경우 현재 앱 origin을 포함하도록 보강했습니다. 이는 YouTube embed 정책에서 발생할 수 있는 출처 불일치 오류를 줄이기 위한 조치입니다.
- `security:scan`이 빌드된 Android WebView asset 경로(`android/app/src/main/assets/public`)까지 확인하도록 확장했고, `.youtube-frame`이 숨겨지거나 1px 플레이어가 되는 회귀를 차단했습니다.
- 회귀 테스트가 Lofi Girl 공식 영상 ID `X4VbdwhkE10`과 visible iframe/origin 조건을 확인하도록 갱신되었습니다.

### Automated Checks

- `npm.cmd run test -- youtubeFallbackUi playbackSource globalRadioCssRegression`: PASS, 3 files / 15 tests
- `npm.cmd run security:scan`: PASS
- `npm.cmd run verify`: PASS
  - lint: PASS
  - typecheck: PASS
  - Vitest: PASS, 15 files / 53 tests
  - production build: PASS
  - security scan: PASS
- `npm.cmd audit --audit-level=moderate`: PASS, vulnerabilities 0
- `npm.cmd run android:debug`: PASS, debug APK build completed with latest web assets

### Post-deploy Browser QA

- Public URL checked: `https://ethanhee890-commits.github.io/global-radio-pwa/`
- GitHub Pages run `29043681305`: PASS
- Mobile 390px:
  - Page title: `지구라디오`
  - Horizontal overflow: none
  - Bottom navigation widths: equal
  - `Lofi Girl` search result count: 2 cards
  - Official YouTube CTA count: 1
  - After CTA tap: exactly one `.youtube-frame`
  - iframe source: `https://www.youtube.com/embed/X4VbdwhkE10?rel=0&origin=https%3A%2F%2Fethanhee890-commits.github.io`
  - iframe display: `display: block`, `visibility: visible`, `opacity: 1`
  - Hidden YouTube iframe count: 0
  - Old unavailable copy `실시간 스트림 녹화를 볼 수 없습니다.`: absent
  - `오류 153`: absent
  - Console warning/error: none
- Mobile 360px:
  - Horizontal overflow: none
  - Bottom navigation widths: equal
  - Bottom sheet remains open and scrollable
  - YouTube iframe remains visible at 262px x 220px
  - Console warning/error: none

### Evidence

- Latest local debug APK: `release\global-radio-android-2026-07-10-qa9\jigu-radio-debug-2026-07-10-qa9.apk`
- Latest local debug ZIP: `release\global-radio-android-2026-07-10-qa9\jigu-radio-debug-2026-07-10-qa9.zip`
- APK SHA-256: `65628D1904E11E240FE6FE9F6CDEA309112C26AC45A3E51EEC86138FB0837AA3`
- ZIP SHA-256: `057F77785399EBF07A7B9A11F45C4A7F8A0FDD3E7F2915EE1C89B8206CF0C9DE`
- Release asset URLs returned `200 OK` after GitHub redirect.

### Not Checked

- Android/iOS 실기기에서 YouTube iframe 재생 버튼 탭 후의 실제 음성 재생 성공 여부
- Real direct-stream audio success rate on physical Android/iOS devices
- Real Android exact alarm behavior at wall-clock time
- iOS native archive/signing and physical-device smoke test
- Long-running stream stability across multiple stations

## 2026-07-10 Release Alias and Mobile List QA Follow-up

### Finding

- GitHub 릴리즈에는 최신 `qa9` APK/ZIP 외에도 `jigu-radio-debug-2026-07-10.apk`, `jigu-radio-latest-debug.apk` 같은 alias 파일이 함께 남아 있었습니다.
- `qa9`는 최신이었지만 alias 파일 크기가 과거 빌드와 달라, 사용자가 오래된 alias 링크를 클릭하면 최신 수정이 반영되지 않은 APK를 받을 수 있는 공유 오류 가능성이 있었습니다.

### Fixed

- `jigu-radio-debug-2026-07-10.apk`
- `jigu-radio-debug-2026-07-10.zip`
- `jigu-radio-latest-debug.apk`
- `jigu-radio-latest-debug.zip`

위 4개 alias 파일을 `qa9`와 동일한 APK/ZIP 내용으로 다시 업로드했습니다.

### Release Asset Checks

- `jigu-radio-debug-2026-07-10-qa9.apk`: HTTP 200, 28,602,704 bytes
- `jigu-radio-debug-2026-07-10.apk`: HTTP 200, 28,602,704 bytes
- `jigu-radio-latest-debug.apk`: HTTP 200, 28,602,704 bytes
- `jigu-radio-debug-2026-07-10-qa9.zip`: HTTP 200, 28,022,337 bytes
- `jigu-radio-debug-2026-07-10.zip`: HTTP 200, 28,022,337 bytes
- `jigu-radio-latest-debug.zip`: HTTP 200, 28,022,337 bytes
- APK aliases SHA-256: `65628D1904E11E240FE6FE9F6CDEA309112C26AC45A3E51EEC86138FB0837AA3`
- ZIP aliases SHA-256: `057F77785399EBF07A7B9A11F45C4A7F8A0FDD3E7F2915EE1C89B8206CF0C9DE`

### APK Internal Asset Checks

- APK `assets/public` entries: 18
- Bundled JS/CSS contains current Lofi Girl YouTube ID `X4VbdwhkE10`: yes
- Bundled JS/CSS contains old Lofi Girl YouTube ID `jfKfPfyJRdk`: no
- `yt-dlp` / `youtube-dl` pattern: no
- hidden YouTube iframe pattern: no
- YouTube embed origin parameter logic: present

### Rendered Browser QA

- Public URL checked: `https://ethanhee890-commits.github.io/global-radio-pwa/`
- Browser path: PASS
- Mobile 390px home:
  - Page title: `지구라디오`
  - Station cards: 168
  - Search input padding: `16px / 16px`
  - Search input and country filter overlap: no
  - Bottom navigation widths: equal
  - Horizontal overflow: none
  - Console warning/error: none
- Saved tab:
  - Saving the first visible station added 1 saved card
  - Saved tab showed no in-page `.direct-player`
  - Saved tab showed no in-page `.station-detail`
  - Hero area hidden outside Home
  - Whole-list delete cleared the saved list
  - Empty state rendered correctly
  - Console warning/error: none
- Recent tab:
  - Empty recent state rendered without duplicate player/detail panels
  - Whole-list delete hidden when the list is empty
  - Horizontal overflow: none
  - Console warning/error: none
- Settings tab:
  - Alarm helper copy is web-scoped and does not mention Android/iOS
  - Hour/minute labels are outside the input boxes
  - Settings screen no longer exposes recent/favorite delete duplicate buttons
  - Alarm primary button computed style: red primary background, white text, opacity 1
  - Horizontal overflow: none

### Not Checked

- Android/iOS physical-device install from the refreshed alias links
- Real Android notification/alarm behavior
- Real iOS Safari/audio behavior
- Long-running audio stability

## 2026-07-10 Android FileProvider Surface QA Follow-up

### Finding

- Android manifest still included a default `FileProvider` entry and `res/xml/file_paths.xml` exposed `<external-path path="." />`.
- The current 지구라디오 app does not use camera, file attachment, export, or share flows. Exposing the whole external storage root was unnecessary for the MVP and increased the native package attack surface.

### Fixed

- `android/app/src/main/res/xml/file_paths.xml` now exposes only app cache through `<cache-path name="shared_cache" path="." />`.
- `security:scan` now fails if `file_paths.xml` reintroduces a whole-root `external-path`.

### Automated Checks

- `npm.cmd run security:scan`: PASS
- `npm.cmd run android:debug`: PASS, debug APK build completed after `cap sync android`
- `npm.cmd run verify`: PASS
  - lint: PASS
  - typecheck: PASS
  - Vitest: PASS, 15 files / 53 tests
  - production build: PASS
  - security scan: PASS
- `.\gradlew.bat :app:lintDebug --console=plain`: PASS
  - `lint-results-debug.xml` issue count: 0

### Package Evidence

- Latest local debug APK: `release\global-radio-android-2026-07-10-qa10\jigu-radio-debug-2026-07-10-qa10.apk`
- Latest local debug ZIP: `release\global-radio-android-2026-07-10-qa10\jigu-radio-debug-2026-07-10-qa10.zip`
- APK SHA-256: `883DDEDFFEEFE92BBD927ABF5882A4E3C2E5505989DEE8591944A4161940442A`
- ZIP SHA-256: `B8FAEE13CE832AECCF175ED7503B82FFBF541F0CD59BE49931CC516C3DC90624`
- APK bundled public assets: 18
- Bundled JS/CSS contains current Lofi Girl YouTube ID `X4VbdwhkE10`: yes
- Bundled JS/CSS contains old Lofi Girl YouTube ID `jfKfPfyJRdk`: no
- `yt-dlp` / `youtube-dl` pattern: no
- hidden YouTube iframe pattern: no

### Not Checked

- Android/iOS physical-device install from the qa10 package
- Runtime verification that no third-party Capacitor/Cordova component expects the removed external file provider path; build/lint passed and no app code references it

## 2026-07-10 QA12 Production And APK Follow-up

### Findings

- The MBC Radio verified YouTube fallback used a channel `live_stream` embed. The visible iframe mounted correctly, but the embedded YouTube surface could show an unavailable video state instead of a playable official stream.
- `scripts/build-android.ps1` did not stop on a failing Gradle exit code because PowerShell external commands do not throw automatically. This could make a failed package build look successful to npm callers.

### Fixed

- `yt-mbc-radio-official` now points to the currently verified official MBC Radio video ID `-icaXPo67uE` instead of the unstable channel `live_stream` embed.
- YouTube fallback tests now assert the MBC alternate is an embeddable `youtube_video`.
- Android build script now throws when `android:sync` or Gradle returns a non-zero exit code.
- Corrupted local Gradle `caches/8.14.3` metadata was cleared and regenerated before rebuilding the debug APK.

### Automated Checks

- `npm.cmd run verify`: PASS
  - lint: PASS
  - typecheck: PASS
  - Vitest: PASS, 15 files / 58 tests
  - production build: PASS
  - security scan: PASS
- `npm.cmd test -- youtubeFallbackUi.test.tsx playbackSource.test.ts japanStations.test.ts`: PASS, 3 files / 16 tests
- `npm.cmd audit --omit=dev`: PASS, 0 vulnerabilities
- `npm.cmd run android:debug`: PASS after Gradle cache regeneration

### Rendered Production QA

- URL: `https://ethanhee890-commits.github.io/global-radio-pwa/`
- Mobile 360px:
  - Page title: `Jigu Radio` browser title equivalent is `지구라디오`
  - Bottom navigation widths: equal, 75px each
  - Horizontal overflow: none
  - Console warning/error: none
  - MBC FM4U search result count: 2
  - Official YouTube CTA count: 2
  - YouTube fallback iframe visible: yes, 262px x 220px
  - YouTube fallback iframe URL: `https://www.youtube.com/embed/-icaXPo67uE?rel=0&origin=https%3A%2F%2Fethanhee890-commits.github.io`
- Mobile 390px:
  - Settings helper copy is web-scoped
  - Alarm action is disabled on web
  - Hour/minute values render without leading-zero lock
  - Horizontal overflow: none

### Package Evidence

- Latest APK release asset: `jigu-radio-latest-debug.apk`
- QA12 APK release asset: `jigu-radio-debug-2026-07-10-qa12.apk`
- APK size: `28602704`
- APK SHA-256: `BB68109E11B9266D749BC5BB78BD77DFA897A4DC9C832981735205C9A97BEA8F`
- Release asset HEAD check: PASS, HTTP 200, `application/vnd.android.package-archive`
- GitHub Pages deployment for commit `3529c39`: PASS
- APK bundled public JS contains MBC video ID `-icaXPo67uE`: yes
- APK bundled public JS contains old MBC channel embed URL `live_stream?channel=UCKNZsAeQXpvI-Mpoc0ZKhsA`: no

### Not Checked

- Android physical-device install and audio output from the QA12 APK
- iOS physical-device install
- iOS Safari direct stream playback rate
- Long-running background playback and alarm behavior on real devices

## 2026-07-10 QA13 Bottom Sheet Drag Follow-up

### Finding

- The current-player bottom sheet could stay open after a downward drag when the pointer release was not delivered to the narrow drag/header element.
- This made the native-style sheet feel stuck even though the dimmed backdrop and close button still worked.

### Fixed

- The bottom sheet shell now also receives pointer move, pointer up, and pointer cancel events as a fallback.
- Drag start remains limited to the sheet drag/header area, but the release can be captured reliably by the sheet container.
- Added a regression test that asserts the bottom sheet shell keeps the fallback drag handlers.

### Automated Checks

- `npm.cmd test -- globalRadioSheetDrag.test.ts`: PASS, 1 file / 1 test
- `npm.cmd run typecheck`: PASS
- `npm.cmd run verify`: PASS
  - lint: PASS
  - typecheck: PASS
  - Vitest: PASS, 16 files / 59 tests
  - production build: PASS
  - security scan: PASS
- `npm.cmd run android:debug`: PASS

### Rendered Local QA

- URL: `http://127.0.0.1:5179/`
- Mobile 390px:
  - Page title: `지구라디오`
  - Station cards loaded: 168
  - Bottom navigation widths: equal, 82px each
  - Horizontal overflow: none
  - Current-player sheet close button: 40px x 40px
  - Downward drag from the sheet grabber closes the sheet: yes
  - Mini player remains visible after sheet drag-close: yes
  - Persistent audio element remains mounted after sheet drag-close: yes
  - Console warning/error: none
- Mobile 360px:
  - Station cards loaded: 168
  - Filter trigger count: 4
  - Bottom navigation widths: equal, 75px each
  - Search input and country filter overlap: no
  - Horizontal overflow: none
  - Console warning/error: none
- Filter relationship QA:
  - Country `전체` with genre menu open does not expose Japan-only options: yes
  - Country `Japan (JP)` exposes `일본 추천`, `공개 FM`, and `NHK/뉴스`: yes
  - Switching country back to `전체` after choosing `일본 추천` resets genre to `전체`: yes
  - Horizontal overflow during filter menu checks: none

### Package Evidence

- Latest APK release asset: `jigu-radio-latest-debug.apk`
- QA13 APK release asset: `jigu-radio-debug-2026-07-10-qa13.apk`
- APK size: `28602704`
- APK SHA-256: `A909578E53B3179B779A6BC3860CB29F5C2F8EFFF15C5DFF36D97414000A7521`
- Release asset HEAD checks: PASS, HTTP 200, `application/vnd.android.package-archive`

### Not Checked

- Android physical-device install and audio output from the QA13 APK
- iOS physical-device install
- iOS Safari direct stream playback rate
- Long-running background playback and alarm behavior on real devices
