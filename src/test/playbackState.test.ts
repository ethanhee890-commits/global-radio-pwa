import { describe, expect, it } from 'vitest';
import { isDirectPlaybackStalled, replaceStationById, replaceStoredStationById, withPlaybackCheckStatus } from '../lib/playbackState';
import { scoreStationQuality } from '../lib/qualityScore';
import type { RadioStation, StoredStation } from '../types/station';

const goodStation: RadioStation = {
  stationuuid: 'station-a',
  name: 'Good Stream',
  url: 'https://example.com/live.mp3',
  url_resolved: 'https://example.com/live.mp3',
  codec: 'MP3',
  bitrate: 192,
  hls: 0,
  lastcheckok: 1,
  ssl_error: 0,
  country: 'Japan',
  language: 'japanese'
};

const otherStation: RadioStation = {
  ...goodStation,
  stationuuid: 'station-b',
  name: 'Other Stream'
};

describe('playback state helpers', () => {
  it('treats a direct stream as stalled until current media data is available', () => {
    expect(isDirectPlaybackStalled(0)).toBe(true);
    expect(isDirectPlaybackStalled(1)).toBe(true);
    expect(isDirectPlaybackStalled(2)).toBe(false);
    expect(isDirectPlaybackStalled(4)).toBe(false);
  });

  it('marks a locally failed stream as failed for quality scoring', () => {
    const failedStation = withPlaybackCheckStatus(goodStation, 0);

    expect(scoreStationQuality(goodStation).grade).toBe('good');
    expect(scoreStationQuality(failedStation).grade).toBe('failed');
    expect(scoreStationQuality(failedStation).isLikelyPlayable).toBe(false);
  });

  it('replaces matching live list entries without disturbing other stations', () => {
    const failedStation = withPlaybackCheckStatus(goodStation, 0);
    const nextStations = replaceStationById([otherStation, goodStation], failedStation);

    expect(nextStations.map((station) => station.stationuuid)).toEqual(['station-b', 'station-a']);
    expect(nextStations[0]).toBe(otherStation);
    expect(nextStations[1].lastcheckok).toBe(0);
  });

  it('updates matching favorites or recents so saved views do not keep stale good quality', () => {
    const storedStations: StoredStation[] = [otherStation, goodStation];
    const failedStation = withPlaybackCheckStatus(goodStation, 0);
    const nextStoredStations = replaceStoredStationById(storedStations, failedStation);

    expect(nextStoredStations.map((station) => station.stationuuid)).toEqual(['station-b', 'station-a']);
    expect(nextStoredStations[0]).toBe(storedStations[0]);
    expect(nextStoredStations[1].lastcheckok).toBe(0);
    expect(scoreStationQuality(nextStoredStations[1]).grade).toBe('failed');
  });

  it('can recover a previously failed saved station after a successful direct playback start', () => {
    const failedStation = withPlaybackCheckStatus(goodStation, 0);
    const recoveredStation = withPlaybackCheckStatus(failedStation, 1);

    expect(scoreStationQuality(failedStation).grade).toBe('failed');
    expect(scoreStationQuality(recoveredStation).grade).toBe('good');
  });
});
