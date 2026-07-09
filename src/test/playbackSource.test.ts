import { describe, expect, it } from 'vitest';
import { getYouTubeAlternate, getYouTubeAlternateForStation } from '../data/youtubeAlternates.seed';
import { getPreferredSource, shouldOfferYouTubeAlternate } from '../lib/playbackSource';
import type { RadioStation } from '../types/station';

const lowQualityStation: RadioStation = {
  stationuuid: 'seed-lofi-girl-low',
  name: 'Lofi Girl Radio Demo',
  url: 'http://example.invalid/low.mp3',
  url_resolved: 'http://example.invalid/low.mp3',
  codec: 'MP3',
  bitrate: 48,
  hls: 0,
  lastcheckok: 1,
  ssl_error: 0
};

describe('getPreferredSource', () => {
  it('keeps a verified YouTube alternate separate for low quality stations', () => {
    const alternate = getYouTubeAlternate(lowQualityStation.stationuuid);
    const recommendation = getPreferredSource(lowQualityStation, alternate);

    expect(recommendation.preferred).toBe('youtube_alternate');
    expect(recommendation.direct?.type).toBe('radio_stream');
    expect(recommendation.youtubeAlternate?.youtubeVideoId).toBe('X4VbdwhkE10');
  });

  it('prefers direct playback for good stations without alternates', () => {
    const recommendation = getPreferredSource({
      stationuuid: 'good-direct',
      name: 'Good Direct',
      url: 'https://example.com/live.mp3',
      url_resolved: 'https://example.com/live.mp3',
      codec: 'MP3',
      bitrate: 192,
      hls: 0,
      lastcheckok: 1,
      ssl_error: 0
    });

    expect(recommendation.preferred).toBe('direct');
    expect(recommendation.youtubeAlternate).toBeNull();
  });

  it('matches verified YouTube alternates by station name when Radio Browser uuid changes', () => {
    const alternate = getYouTubeAlternateForStation({
      stationuuid: 'radio-browser-dynamic-mbc-id',
      name: 'MBC FM4U',
      url: 'https://minimw.imbc.com/dmfm/_definst_/mfm.stream/playlist.m3u8',
      url_resolved: 'https://minimw.imbc.com/dmfm/_definst_/mfm.stream/playlist.m3u8',
      country: 'The Republic Of Korea',
      countrycode: 'KR',
      language: 'korean',
      codec: 'AAC+',
      bitrate: 107,
      hls: 1,
      lastcheckok: 1,
      ssl_error: 0
    });

    expect(alternate?.id).toBe('yt-mbc-radio-official');
    expect(alternate?.type).toBe('youtube_video');
    expect(alternate?.youtubeVideoId).toBe('-icaXPo67uE');
  });

  it('does not offer the visible YouTube player while a direct stream is still good', () => {
    const station: RadioStation = {
      stationuuid: 'seed-jp-shonan-beach-fm',
      name: 'Shonan Beach FM 78.9',
      url: 'https://shonanbeachfm.out.airtime.pro:8000/shonanbeachfm_a',
      url_resolved: 'https://shonanbeachfm.out.airtime.pro:8000/shonanbeachfm_a',
      codec: 'MP3',
      bitrate: 128,
      hls: 0,
      lastcheckok: 1,
      ssl_error: 0
    };
    const alternate = getYouTubeAlternateForStation(station);

    expect(alternate).not.toBeNull();
    expect(shouldOfferYouTubeAlternate(station, alternate)).toBe(false);
    expect(getPreferredSource(station, alternate).preferred).toBe('direct');
  });

  it('offers the verified YouTube alternate after a local direct playback failure', () => {
    const failedStation: RadioStation = {
      stationuuid: 'seed-jp-shonan-beach-fm',
      name: 'Shonan Beach FM 78.9',
      url: 'https://shonanbeachfm.out.airtime.pro:8000/shonanbeachfm_a',
      url_resolved: 'https://shonanbeachfm.out.airtime.pro:8000/shonanbeachfm_a',
      codec: 'MP3',
      bitrate: 128,
      hls: 0,
      lastcheckok: 0,
      ssl_error: 0
    };
    const alternate = getYouTubeAlternateForStation(failedStation);

    expect(shouldOfferYouTubeAlternate(failedStation, alternate)).toBe(true);
    expect(getPreferredSource(failedStation, alternate).preferred).toBe('youtube_alternate');
  });

  it('offers the verified YouTube alternate for protected official-app stream URLs', () => {
    const protectedStation: RadioStation = {
      stationuuid: 'radio-browser-dynamic-mbc-id',
      name: 'MBC FM4U',
      url: 'https://minimw.imbc.com/dmfm/_definst_/mfm.stream/playlist.m3u8',
      url_resolved: 'https://minimw.imbc.com/dmfm/_definst_/mfm.stream/playlist.m3u8',
      country: 'The Republic Of Korea',
      countrycode: 'KR',
      language: 'korean',
      codec: 'AAC+',
      bitrate: 107,
      hls: 1,
      lastcheckok: 1,
      ssl_error: 0
    };
    const alternate = getYouTubeAlternateForStation(protectedStation);

    expect(alternate?.id).toBe('yt-mbc-radio-official');
    expect(shouldOfferYouTubeAlternate(protectedStation, alternate)).toBe(true);
    expect(getPreferredSource(protectedStation, alternate).preferred).toBe('youtube_alternate');
  });
});
