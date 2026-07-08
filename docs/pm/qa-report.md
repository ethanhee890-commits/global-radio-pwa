---
type: qa-report
project: "GlobalRadioPWA"
status: active
last_updated: "2026-07-08"
tags:
  - qa
  - global-radio
  - japan-radio
  - alarm
  - now-playing
---

# QA Report - 지구라디오 알람, 현재곡 및 UI/UX 업데이트

## Scope

- 현재 재생 중인 방송의 프로그램명/곡명 패널 추가
- KEXP 공식 now-playing API 연동 및 Media Session metadata 반영
- 지원 API가 없는 방송은 추정값을 만들지 않고 미지원 상태로 표시
- 앱이 열린 상태에서 지정 시각에 선택 채널 재생을 시도하는 라디오 알람 MVP 추가
- 설정 화면에 알람 패널 추가
- 깨진 한글 UI 문구 정리
- 새 패널을 포함한 데스크톱 및 360px 모바일 레이아웃 정리
- CSP에 `https://api.kexp.org`를 허용해 공식 now-playing API 호출 가능하게 수정
- 앱 타이틀을 `지구라디오 - 지금 들을 방송을 고르세요`로 변경
- 히어로 카피, CTA, 상태 스트립, 내비게이션 라벨을 청취 행동 중심으로 재정리
- `Preferences`, `Morning Radio`, `Now Playing` 등 보이는 영어 보조 라벨을 한국어 톤으로 정리
- 모바일/태블릿에서 방송 선택 후 재생 정보 영역이 목록 아래에 묻히지 않도록 상단으로 이동

## Automated Checks

- `npm.cmd run verify`: PASS
  - lint: PASS
  - typecheck: PASS
  - vitest: 7 files / 23 tests PASS
  - build: PASS
  - security scan: PASS
- `npm.cmd audit --audit-level=moderate`: PASS, vulnerabilities 0

## Browser Checks

- Current dev URL: `http://127.0.0.1:5179/`
- Production preview URL: `http://127.0.0.1:5184/`
- Desktop preview 1366px: PASS
  - hero title visible
  - now-playing panel visible
  - direct player / now-playing / station detail panels visible
  - settings alarm panel visible
  - horizontal overflow: none
  - console error: none
- Mobile 360px dev URL: PASS
  - document width: 360
  - horizontal overflow: none
  - now-playing panel visible
  - settings alarm panel visible
  - app console errors: none
- UI/UX regression check with installed Chrome: PASS
  - 676px viewport: title updated, hero height 278.8px, H1 34px / 40.12px line-height, hero CTA buttons 42px high, status text not clipped
  - 360px viewport: title updated, hero height 248.97px, CTA buttons 306px x 42px, hero status strip hidden, horizontal overflow none
  - 360px settings view: `설정` tab active, alarm panel width 336px, horizontal overflow none
  - visible legacy English labels (`Preferences`, `Morning Radio`, `Now Playing`, `Listen smarter`): none
  - console errors/warnings during UI check: none
- Player placement UX check with clean storage: PASS
  - initial 360px viewport: no auto-selected station, search/list panel appears before player panel
  - after selecting first station at 360px: player panel ordered above list, scrolled to top of player panel, selected station shown in direct player
  - after selecting first station at 676px: player panel ordered above list, scrolled to top of player panel
  - desktop 1200px: existing two-column layout preserved
  - horizontal overflow: none
- KEXP now-playing browser check: PASS
  - provider: `KEXP 공개 API`
  - sample track loaded during QA: `Won't Wait`
  - sample artist loaded during QA: `Makthaverskan`
  - console errors after CSP fix: none

## Current Catalog Evidence

- fallback station count: 51
- Japan fallback stations: 12
- non-Japan fallback stations: 39
- covered country codes: JP, KR, US, GB, DE, FR, CA, AU, NL, BR, ES, IT, TW, SG

## Not Checked

- iOS Safari real-device direct audio playback
- closed/background browser alarm reliability
- radiko-only Japan domestic station playback
- long-running live-stream stability
