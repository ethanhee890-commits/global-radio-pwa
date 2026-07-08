import type { NowPlayingInfo, RadioStation } from '../types/station';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type KexpPlay = {
  artist?: string;
  song?: string;
  album?: string;
  image_uri?: string;
  thumbnail_uri?: string;
  show_uri?: string;
  airdate?: string;
};

type KexpShow = {
  program_name?: string;
  host_names?: string[];
};

const KEXP_NOW_PLAYING_URL = 'https://api.kexp.org/v2/plays/?limit=1&ordering=-airdate';

export function getNowPlayingProvider(station: RadioStation): 'kexp' | null {
  const searchable = [station.stationuuid, station.name, station.homepage, station.tags].join(' ').toLowerCase();
  return searchable.includes('kexp') ? 'kexp' : null;
}

export function getStationOnlyNowPlaying(station: RadioStation | null): NowPlayingInfo {
  if (!station) {
    return {
      status: 'idle',
      message: '방송국을 선택하면 현재 재생 정보가 여기 표시됩니다.'
    };
  }

  return {
    status: 'unavailable',
    stationName: station.name,
    sourceUrl: station.homepage,
    message: '이 방송국은 앱에서 직접 읽을 수 있는 실시간 프로그램/곡명 API가 아직 연결되지 않았습니다.'
  };
}

export async function fetchNowPlayingInfo(station: RadioStation, fetcher: FetchLike = fetch): Promise<NowPlayingInfo> {
  const provider = getNowPlayingProvider(station);
  const checkedAt = new Date().toISOString();

  if (provider !== 'kexp') {
    return {
      ...getStationOnlyNowPlaying(station),
      checkedAt
    };
  }

  try {
    const playResponse = await fetcher(KEXP_NOW_PLAYING_URL, { headers: { Accept: 'application/json' } });
    if (!playResponse.ok) {
      throw new Error(`KEXP now-playing request failed: ${playResponse.status}`);
    }

    const playPayload = (await playResponse.json()) as { results?: KexpPlay[] };
    const play = playPayload.results?.[0];
    let show: KexpShow | null = null;

    if (play?.show_uri) {
      const showResponse = await fetcher(play.show_uri, { headers: { Accept: 'application/json' } });
      if (showResponse.ok) {
        show = (await showResponse.json()) as KexpShow;
      }
    }

    if (!play?.song && !play?.artist && !show?.program_name) {
      return {
        status: 'unavailable',
        stationName: station.name,
        provider: 'KEXP 공개 API',
        checkedAt,
        message: 'KEXP API가 응답했지만 표시할 곡명이나 프로그램명이 없습니다.'
      };
    }

    return {
      status: 'available',
      stationName: station.name,
      provider: 'KEXP 공개 API',
      programTitle: show?.program_name,
      trackTitle: play?.song,
      artist: play?.artist,
      album: play?.album,
      artworkUrl: play?.thumbnail_uri || play?.image_uri,
      sourceUrl: play?.show_uri || KEXP_NOW_PLAYING_URL,
      checkedAt,
      message: '공식 now-playing API에서 가져온 정보입니다.'
    };
  } catch {
    return {
      status: 'error',
      stationName: station.name,
      provider: 'KEXP 공개 API',
      checkedAt,
      message: '현재 재생 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
    };
  }
}

export function getMediaSessionMetadata(station: RadioStation | null, nowPlaying: NowPlayingInfo): MediaMetadataInit | null {
  if (!station) {
    return null;
  }

  return {
    title: nowPlaying.trackTitle || station.name,
    artist: nowPlaying.artist || [station.country, station.language].filter(Boolean).join(' / ') || '지구라디오',
    album: nowPlaying.programTitle || station.name,
    artwork: nowPlaying.artworkUrl
      ? [
          {
            src: nowPlaying.artworkUrl,
            sizes: '250x250',
            type: 'image/jpeg'
          }
        ]
      : undefined
  };
}
