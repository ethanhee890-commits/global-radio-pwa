import { describe, expect, it, vi } from 'vitest';
import { fetchNowPlayingInfo, getMediaSessionMetadata, getNowPlayingProvider, getStationOnlyNowPlaying } from '../lib/nowPlaying';
import type { RadioStation } from '../types/station';

const kexpStation: RadioStation = {
  stationuuid: 'seed-us-kexp-high',
  name: 'KEXP 90.3 FM',
  url: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3',
  country: 'The United States Of America',
  countrycode: 'US',
  language: 'english',
  tags: 'music,alternative,indie,seattle',
  codec: 'MP3',
  bitrate: 128,
  hls: 0,
  lastcheckok: 1,
  ssl_error: 0
};

const nhkStation: RadioStation = {
  stationuuid: 'seed-jp-nhk-world-radio',
  name: 'NHK WORLD-JAPAN Radio',
  url: 'https://masterpl.hls.nhkworld.jp/hls/r1/live/master.m3u8',
  country: 'Japan',
  countrycode: 'JP',
  language: 'japanese',
  tags: 'japan,nhk,news',
  codec: 'AAC',
  bitrate: 96,
  hls: 1,
  lastcheckok: 1,
  ssl_error: 0
};

describe('now playing metadata', () => {
  it('detects KEXP as a supported now-playing provider', () => {
    expect(getNowPlayingProvider(kexpStation)).toBe('kexp');
    expect(getNowPlayingProvider(nhkStation)).toBeNull();
  });

  it('returns station-only status for unsupported stations', () => {
    const info = getStationOnlyNowPlaying(nhkStation);

    expect(info.status).toBe('unavailable');
    expect(info.stationName).toBe('NHK WORLD-JAPAN Radio');
    expect(info.message).toContain('실시간 프로그램/곡명 API');
  });

  it('maps KEXP API responses to program and track metadata', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                song: 'Rose Rouge',
                artist: 'Jorja Smith',
                album: 'Rose Rouge',
                thumbnail_uri: 'https://example.com/cover.jpg',
                show_uri: 'https://api.kexp.org/v2/shows/1/'
              }
            ]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ program_name: 'Variety Mix' }), { status: 200 }));

    const info = await fetchNowPlayingInfo(kexpStation, fetcher);

    expect(info.status).toBe('available');
    expect(info.trackTitle).toBe('Rose Rouge');
    expect(info.artist).toBe('Jorja Smith');
    expect(info.programTitle).toBe('Variety Mix');
  });

  it('builds Media Session metadata from current track when available', () => {
    const metadata = getMediaSessionMetadata(kexpStation, {
      status: 'available',
      stationName: 'KEXP 90.3 FM',
      trackTitle: 'Rose Rouge',
      artist: 'Jorja Smith',
      programTitle: 'Variety Mix',
      message: 'ok'
    });

    expect(metadata?.title).toBe('Rose Rouge');
    expect(metadata?.artist).toBe('Jorja Smith');
    expect(metadata?.album).toBe('Variety Mix');
  });
});
