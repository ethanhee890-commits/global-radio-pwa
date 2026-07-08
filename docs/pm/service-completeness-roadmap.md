---
type: product-roadmap
project: "GlobalRadioPWA"
status: active
last_updated: "2026-07-08"
tags:
  - roadmap
  - global-radio
  - alarm
  - now-playing
---

# Service Completeness Roadmap

## Implemented In This Update

- 라디오 알람 MVP: 설정한 시간에 선택 채널 재생을 시도합니다.
- 현재 프로그램/곡명 패널: KEXP처럼 공식 now-playing API가 확인된 방송은 실제 곡명, 아티스트, 프로그램명을 표시합니다.
- Media Session metadata: 지원 브라우저의 OS 미디어 UI에 현재 곡/방송 정보를 전달합니다.
- GUI 업데이트: 설정 화면을 2열 구조로 정리하고, 플레이어 영역에 direct player, 현재곡, 방송 상세 정보를 함께 배치했습니다.
- CSP 업데이트: `api.kexp.org`를 connect-src에 추가했습니다.

## Browser Constraints

- `HTMLMediaElement.play()`는 브라우저 자동재생 정책에 의해 거부될 수 있습니다.
- Notification API는 secure context와 사용자 권한이 필요합니다.
- iOS/iPadOS의 웹 push는 Home Screen에 추가된 web app 기준으로 지원됩니다.
- 따라서 웹앱만으로 닫힌 앱/백그라운드에서 정확한 “아침 알람 자동 재생”을 보장하기는 어렵습니다.

## Recommended Next Work

1. 일본 방송 우선 완성도
   - NHK, 공개 community FM, 공식 사이트 제공 스트림을 계속 seed로 확장합니다.
   - radiko 전용 방송은 권역 우회 없이 “지원 불가/공식 앱 필요”로 분리합니다.

2. Now-playing provider registry
   - KEXP 외 방송국별 공식 JSON/XML API를 검수해 provider registry를 확장합니다.
   - ICY metadata는 브라우저 CORS 제약이 잦으므로 서버 프록시가 필요한지 별도 검토합니다.

3. Alarm reliability
   - PWA foreground 알람은 유지하되, 닫힌 상태 알람은 네이티브 앱 또는 push 백엔드 후보로 분리합니다.
   - iOS Safari 실기기에서 재생 차단, 화면 잠금, Home Screen 설치 상태별 성공률을 샘플링합니다.

4. GUI polish
   - 현재곡 지원 여부, 알람 활성 상태, 일본 검증 상태를 더 촘촘한 badge로 노출합니다.
   - 방송 상세 패널에 “왜 이 방송이 먼저 보이는지” 품질 점수 설명을 더 읽기 쉽게 정리합니다.

5. Launch readiness
   - 장시간 스트림 안정성 테스트를 국가별 대표 방송으로 수행합니다.
   - GitHub Pages 배포 후 모바일 Chrome, iOS Safari, desktop Chrome 기준 smoke test를 반복합니다.

## Source Notes

- MDN HTMLMediaElement `play()` 문서는 autoplay 정책으로 재생 Promise가 거부될 수 있음을 설명합니다.
- MDN Notification API 문서는 secure context와 권한 모델을 전제로 합니다.
- WebKit iOS/iPadOS web push 문서는 Home Screen web app 중심의 push 지원을 설명합니다.
- MDN Media Session API 문서는 현재 재생 metadata를 운영체제 UI에 노출하는 방식을 설명합니다.
