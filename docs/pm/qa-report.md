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
