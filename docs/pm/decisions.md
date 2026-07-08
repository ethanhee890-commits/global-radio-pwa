---
type: project-doc
project: "GlobalRadioPWA"
status: active
owner: Dex
last_updated: "2026-07-08"
tags:
  - decisions
  - pm
---

# Project Decision Log - 지구라디오

## Decision 001 - Product Boundary

### Date
2026-07-08

### Decision
지구라디오는 실제 RF 주파수 수신 앱이 아니라 전세계 공개 인터넷 라디오 스트림 청취 PWA로 정의한다.

### Reason
모바일 웹에서 실제 FM/AM 주파수를 직접 수신하는 것은 MVP 범위가 아니며 사용자 오해를 만들 수 있다.

### Impact
Radio Browser API와 HTML audio 기반 구현에 집중한다.

### Status
Accepted

---

## Decision 002 - YouTube Policy

### Date
2026-07-08

### Decision
YouTube는 direct radio stream의 대체 소스로만 제공하고, 오디오 추출, hidden iframe, background player, yt-dlp/youtube-dl 사용은 금지한다.

### Reason
YouTube audiovisual content를 audio-only처럼 분리하거나 숨겨 재생하는 방식은 정책 리스크가 크다.

### Impact
검증된 공식 YouTube 대체 소스가 있을 때만 visible IFrame Player를 표시한다.

### Status
Accepted

---

## Decision 003 - Quality Gate

### Date
2026-07-08

### Decision
품질 점수는 codec, bitrate, HLS, HTTPS, lastcheckok, ssl_error를 기준으로 계산한다.

### Reason
사용자는 "음질 좋은 라디오"를 기대하므로 단순 인기순보다 재생 가능성과 스트림 품질을 우선해야 한다.

### Impact
`qualityScore.ts`의 점수와 등급을 방송국 목록 정렬, 상세 설명, 낮은 품질 감춤 설정에 사용한다.

### Status
Accepted

---

## Decision 004 - Japan As Priority, Not Sole Scope

### Date
2026-07-08

### Decision
앱은 전세계 라디오 앱으로 유지하되, 일본은 우선 완성도 국가로 다룬다.

### Reason
요구사항은 "일본 전용 앱"이 아니라 "여러 나라 중 일본 라디오 채널 완성도가 특히 높아야 함"이다.

### Impact
기본 discovery는 14개 국가를 넓게 조회한다. 일본 CTA는 `JP` country code와 `japanese` language로 Radio Browser 실제 일본 채널까지 넓게 가져오며, fallback seed도 일본 12개를 포함한다.

### Status
Accepted

---

## Decision 005 - Japan Source Policy

### Date
2026-07-08

### Decision
일본 방송 seed는 공개 인터넷 스트림 또는 Radio Browser에서 lastcheckok가 통과한 공개 후보만 사용하고, radiko 전용 주요 민방은 권역 제한 우회 없이 제외한다.

### Reason
radiko는 일본 내 이용 제한이 있는 경우가 많고, 비공식 NHK mirror는 안정성과 합법성 리스크가 있다.

### Impact
NHK WORLD-JAPAN Radio, Shonan Beach FM, FM Kahoku, Chofu FM 같은 공개 후보를 우선 노출하고, `mnet.x10.mx` 같은 비공식 NHK mirror는 curated seed에 넣지 않는다.

### Status
Accepted
