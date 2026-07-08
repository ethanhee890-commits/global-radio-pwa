# 지구라디오

전세계 공개 인터넷 라디오를 검색하고, 품질 좋은 직접 스트림을 우선 재생하는 모바일 PWA입니다. 기본 화면은 Radio Browser API로 여러 국가를 넓게 조회하고, API가 느리거나 실패할 때도 14개 국가 51개 curated seed로 바로 들을 수 있게 구성했습니다.

일본은 전체 서비스 안의 우선 국가로 다룹니다. 일본 전용 앱으로 좁히지 않고, 일본 채널 완성도를 더 높이기 위해 NHK WORLD-JAPAN Radio, Shonan Beach FM, FM Kahoku, Chofu FM 등 일본 seed 12개와 JP country-code 검색을 우선 지원합니다.

## 주요 기능

- Radio Browser API 기반 전세계 공개 인터넷 라디오 검색
- 기본 discovery에서 일본, 한국, 미국, 영국, 독일, 프랑스, 캐나다, 호주, 네덜란드, 브라질, 스페인, 이탈리아, 대만, 싱가포르를 우선 조회
- codec, bitrate, HLS, lastcheckok, ssl_error, HTTPS 기준 품질 점수 계산
- 고음질 방송 우선 정렬
- 직접 라디오 스트림은 HTML audio로 재생
- 직접 스트림 품질이 낮거나 실패했고 검증된 공식 YouTube 대체 소스가 있을 때만 visible YouTube IFrame Player로 대체
- YouTube 오디오 추출, hidden iframe, background player, yt-dlp/youtube-dl 미사용
- 즐겨찾기와 최근 들은 방송 localStorage 저장
- 360px 모바일 폭 대응

## 실행

```bash
npm install
npm run dev
```

로컬에서 열린 주소를 브라우저로 접속하면 됩니다.

## 검증

```bash
npm run verify
npm audit
```

## 참고

일본 민영/공중파의 상당수는 radiko 권역 정책을 따르므로, 권역 우회가 필요한 소스는 seed에 넣지 않았습니다. direct stream이 브라우저에서 실패할 때도 YouTube 대체 재생은 공식 채널/공식 페이지로 검증된 경우에만 표시합니다.
