import type { RadioStation, YouTubeAlternateSource } from '../types/station';

export const YOUTUBE_ALTERNATES_SEED: YouTubeAlternateSource[] = [
  {
    id: 'yt-lofi-girl-live',
    stationuuid: 'seed-lofi-girl-low',
    type: 'youtube_video',
    youtubeVideoId: 'X4VbdwhkE10',
    label: 'Lofi Girl 공식 YouTube 라이브',
    verificationStatus: 'verified',
    verificationMethod: 'manual_seed',
    sourceUrl: 'https://www.youtube.com/watch?v=X4VbdwhkE10',
    note: '2026-07-10 기준 Lofi Girl 공식 채널(@LofiGirl)의 현재 라이브 스트림으로 확인했습니다. YouTube는 visible iframe으로만 제공합니다.'
  },
  {
    id: 'yt-shonan-beach-fm-live',
    stationuuid: 'seed-jp-shonan-beach-fm',
    type: 'youtube_live',
    youtubeVideoId: 'qGCPvnk8Unc',
    label: 'Shonan Beach FM 공식 Live Cam',
    verificationStatus: 'verified',
    verificationMethod: 'official_homepage',
    sourceUrl: 'https://www.beachfm.co.jp/radio/',
    note: '공식 LISTEN NOW 페이지에 노출된 YouTube embed ID입니다. visible iframe으로만 제공합니다.'
  },
  {
    id: 'yt-mbc-radio-official',
    stationuuid: 'alias-mbc-fm4u',
    stationNameAliases: ['MBC FM4U', 'MBC FM4U 91.9', 'MBC FM4U Seoul'],
    type: 'youtube_video',
    youtubeVideoId: '-icaXPo67uE',
    label: 'MBC Radio 공식 YouTube',
    verificationStatus: 'verified',
    verificationMethod: 'manual_seed',
    sourceUrl: 'https://www.youtube.com/watch?v=-icaXPo67uE',
    note: '2026-07-10 기준 MBC Radio 공식 채널(@radiombc)의 현재 공개 라이브 영상으로 확인했습니다. 채널 live_stream embed가 불안정해 실제 영상 ID를 visible iframe으로만 제공합니다.'
  }
];

export const FALLBACK_STATIONS: RadioStation[] = [
  {
    stationuuid: 'seed-kexp-high',
    name: 'KEXP 90.3 FM',
    url: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3',
    url_resolved: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3',
    homepage: 'https://www.kexp.org/',
    favicon: 'https://www.kexp.org/favicon.ico',
    tags: 'music,alternative,indie,seattle',
    country: 'United States',
    countrycode: 'US',
    language: 'english',
    codec: 'MP3',
    bitrate: 128,
    hls: 0,
    lastcheckok: 1,
    ssl_error: 0,
    votes: 3200,
    clickcount: 24000,
    source: 'seed'
  },
  {
    stationuuid: 'seed-bbc-world-service',
    name: 'BBC World Service',
    url: 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service',
    url_resolved: 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service',
    homepage: 'https://www.bbc.co.uk/worldserviceradio',
    favicon: 'https://www.bbc.co.uk/favicon.ico',
    tags: 'news,talk,world',
    country: 'United Kingdom',
    countrycode: 'GB',
    language: 'english',
    codec: 'MP3',
    bitrate: 96,
    hls: 0,
    lastcheckok: 1,
    ssl_error: 0,
    votes: 2800,
    clickcount: 18000,
    source: 'seed'
  },
  {
    stationuuid: 'seed-jp-nhk-world-radio',
    name: 'NHK WORLD-JAPAN Radio',
    url: 'https://masterpl.hls.nhkworld.jp/hls/r1/live/master.m3u8',
    url_resolved: 'https://masterpl.hls.nhkworld.jp/hls/r1/live/master.m3u8',
    homepage: 'https://www3.nhk.or.jp/nhkworld/ja/',
    favicon: 'https://www3.nhk.or.jp/nhkworld/favicon.ico',
    tags: 'japan,japan-priority,nhk,public-broadcaster,official,news,talk,hls',
    country: 'Japan',
    countrycode: 'JP',
    language: 'japanese',
    codec: 'AAC+',
    bitrate: 96,
    hls: 1,
    lastcheckok: 1,
    ssl_error: 0,
    votes: 4200,
    clickcount: 32000,
    source: 'seed'
  },
  {
    stationuuid: 'seed-jp-shonan-beach-fm',
    name: 'Shonan Beach FM 78.9',
    url: 'https://shonanbeachfm.out.airtime.pro:8000/shonanbeachfm_a',
    url_resolved: 'https://shonanbeachfm.out.airtime.pro:8000/shonanbeachfm_a',
    homepage: 'https://www.beachfm.co.jp/radio/',
    favicon: 'https://www.beachfm.co.jp/favicon.ico',
    tags: 'japan,japan-priority,terrestrial-fm,community-fm,official,jazz,kanagawa,shonan,hayama,zushi',
    country: 'Japan',
    countrycode: 'JP',
    language: 'japanese,english',
    codec: 'MP3',
    bitrate: 128,
    hls: 0,
    lastcheckok: 1,
    ssl_error: 0,
    votes: 3600,
    clickcount: 26000,
    source: 'seed'
  },
  {
    stationuuid: 'seed-jp-fm-kahoku',
    name: 'FM Kahoku 78.7',
    url: 'http://radio.kahoku.net:8000/;',
    url_resolved: 'http://radio.kahoku.net:8000/;',
    homepage: 'https://fm.kahoku.net/',
    favicon: 'https://fm.kahoku.net/favicon.ico',
    tags: 'japan,japan-priority,terrestrial-fm,community-fm,official,ishikawa,kahoku,talk,local-news',
    country: 'Japan',
    countrycode: 'JP',
    language: 'japanese',
    codec: 'MP3',
    bitrate: 96,
    hls: 0,
    lastcheckok: 1,
    ssl_error: 0,
    votes: 1600,
    clickcount: 11000,
    source: 'seed'
  },
  {
    stationuuid: 'seed-jazz-radio-high',
    name: 'Jazz Sakura Radio',
    url: 'https://stream.zeno.fm/0r0xa792kwzuv',
    url_resolved: 'https://stream.zeno.fm/0r0xa792kwzuv',
    homepage: 'https://zeno.fm/',
    tags: 'jazz,japan,relax',
    country: 'Japan',
    countrycode: 'JP',
    language: 'japanese',
    codec: 'AAC',
    bitrate: 128,
    hls: 0,
    lastcheckok: 1,
    ssl_error: 0,
    votes: 120,
    clickcount: 1900,
    source: 'seed'
  },
  {
    stationuuid: 'seed-lofi-girl-low',
    name: 'Lofi Girl Radio Demo',
    url: 'http://example.invalid/lofi-low.mp3',
    url_resolved: 'http://example.invalid/lofi-low.mp3',
    homepage: 'https://www.youtube.com/@LofiGirl',
    tags: 'lofi,study,youtube-alternate',
    country: 'France',
    countrycode: 'FR',
    language: 'instrumental',
    codec: 'MP3',
    bitrate: 48,
    hls: 0,
    lastcheckok: 1,
    ssl_error: 0,
    votes: 50,
    clickcount: 800,
    source: 'seed'
  },
  {
    stationuuid: 'seed-broken-stream',
    name: 'Broken Stream QA Demo',
    url: 'https://example.invalid/broken-stream.mp3',
    url_resolved: 'https://example.invalid/broken-stream.mp3',
    tags: 'qa,broken',
    country: 'Test',
    countrycode: 'TS',
    language: 'test',
    codec: 'MP3',
    bitrate: 64,
    hls: 0,
    lastcheckok: 0,
    ssl_error: 0,
    votes: 0,
    clickcount: 0,
    source: 'seed'
  }
];

function normalizeStationName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '');
}

export function getYouTubeAlternate(stationuuid: string): YouTubeAlternateSource | null {
  return YOUTUBE_ALTERNATES_SEED.find((source) => source.stationuuid === stationuuid && source.verificationStatus !== 'rejected') ?? null;
}

export function getYouTubeAlternateForStation(station: RadioStation): YouTubeAlternateSource | null {
  const exactMatch = getYouTubeAlternate(station.stationuuid);
  if (exactMatch) {
    return exactMatch;
  }

  const stationName = normalizeStationName(station.name);
  return (
    YOUTUBE_ALTERNATES_SEED.find((source) => {
      if (source.verificationStatus === 'rejected' || !source.stationNameAliases?.length) {
        return false;
      }

      return source.stationNameAliases.some((alias) => stationName.includes(normalizeStationName(alias)));
    }) ?? null
  );
}
