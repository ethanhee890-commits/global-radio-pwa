---
type: qa-report
project: "GlobalRadioPWA"
status: active
last_updated: "2026-07-08"
tags:
  - qa
  - global-radio
  - japan-radio
---

# QA Report - 지구라디오 채널 확장

## Scope

- 기본 discovery를 단일 `jazz` 검색에서 전세계 다국가 discovery로 변경
- Radio Browser country filter를 ISO country code 기반으로 안정화
- curated fallback catalog를 51개 방송국, 14개 국가로 확장
- 일본은 전용 앱으로 좁히지 않고, 우선 국가로 강화
- 일본 fallback seed: 12개
- 일본 CTA: `JP + japanese + 전체 태그`로 Radio Browser 실제 일본 채널까지 조회
- 일본 추천/공개 FM/NHK quick filter 유지
- radiko 우회, 비공식 NHK mirror, hidden YouTube, audio extraction 금지 유지

## Automated Checks

- `npm.cmd run verify`: PASS
  - lint: PASS
  - typecheck: PASS
  - vitest: 5 files / 14 tests PASS
  - build: PASS
  - security scan: PASS
- `npm.cmd audit`: PASS, vulnerabilities 0
- Browser QA with local Chrome against Vite preview: PASS
  - global discovery catalog test added
  - Radio Browser country-code routing test added
  - insecure favicon filtering test added

## Current Catalog Evidence

- fallback station count: 51
- Japan fallback stations: 12
- non-Japan fallback stations: 39
- covered country codes: JP, KR, US, GB, DE, FR, CA, AU, NL, BR, ES, IT, TW, SG

## Browser Checks

- Local preview URL: `http://127.0.0.1:5183/`
- Desktop default discovery: PASS
  - visible station cards: 124
  - detected country coverage: 16 displayed country strings across the list
  - NHK WORLD-JAPAN and Chofu FM appear in the default high-quality group
  - horizontal overflow: none
  - console warning/error: none
- Japan CTA: PASS
  - visible station cards after CTA: 112
  - NHK WORLD-JAPAN: visible
  - Shonan Beach FM: visible
  - FM Kahoku: visible
  - Chofu FM: visible
  - horizontal overflow: none
- Mobile 360px: PASS
  - visible station cards: 124
  - document width: 360
  - scroll width: 360
  - horizontal overflow: none

## Stream Checks To Refresh

- NHK WORLD-JAPAN HLS playlist
- Shonan Beach FM HTTPS MP3 stream
- FM Kahoku HTTP MP3 stream
- Chofu FM HLS stream
- Representative non-Japan streams from US, GB, FR, TW

## Not Checked

- iOS Safari real-device direct audio playback
- radiko-only Japan domestic station playback
- Long-running live-stream stability
