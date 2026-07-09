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
