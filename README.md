# 지구라디오

전세계 공개 인터넷 라디오를 검색하고, 품질 좋은 직접 스트림을 우선 재생하는 모바일 PWA입니다. Radio Browser API를 기본 검색원으로 사용하고, API가 느리거나 실패해도 14개 국가 51개 curated seed로 바로 들을 수 있게 구성했습니다.

일본은 우선 국가로 다룹니다. NHK WORLD-JAPAN Radio, Shonan Beach FM, FM Kahoku, Chofu FM 등 일본 seed 12개와 JP country-code 검색을 우선 지원하며, radiko 전용 권역 제한 방송은 우회 없이 제외합니다.

## 주요 기능

- Radio Browser API 기반 전세계 공개 인터넷 라디오 검색
- 기본 discovery에서 일본, 한국, 미국, 영국, 독일, 프랑스, 캐나다, 호주, 네덜란드, 브라질, 스페인, 이탈리아, 대만, 싱가포르 우선 조회
- codec, bitrate, HLS, lastcheckok, ssl_error, HTTPS 기준 품질 점수 계산
- 고음질 방송 우선 정렬
- direct radio stream은 HTML audio로 재생
- 공식 now-playing API가 연결된 방송은 현재 프로그램명과 곡명 표시
- OS 미디어 UI에는 Media Session metadata로 현재 곡/방송국 정보 전달
- 직접 스트림 품질이 낮거나 실패했고 검증된 공식 YouTube 대체 소스가 있을 때만 visible YouTube IFrame Player 표시
- YouTube 오디오 추출, hidden iframe, background player, yt-dlp/youtube-dl 미사용
- 즐겨찾기, 최근 들은 방송, 라디오 알람 설정을 localStorage에 저장
- 앱이 열린 상태에서 지정 시간에 선택한 라디오 채널 재생을 시도하는 아침 알람 MVP
- 360px 모바일 폭 대응

## 실행

```bash
npm install
npm run dev
```

현재 개발 확인 URL:

```text
http://127.0.0.1:5179/
```

## 검증

```bash
npm run verify
npm audit
```

## 참고

브라우저와 iOS Safari는 사용자 동작 없이 오디오 자동 재생을 막을 수 있습니다. 그래서 알람은 앱이 열려 있을 때 정해진 시각에 재생을 시도하고, 재생이 차단되면 사용자가 바로 재생 버튼을 누를 수 있게 안내합니다. 닫힌 앱/백그라운드에서 정확한 알람 재생을 보장하려면 네이티브 앱 또는 서버 push 기반 설계가 필요합니다.
