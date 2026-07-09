import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveFavoriteStations, saveGlobalRadioSettings, saveRecentStations } from '../lib/globalRadioStorage';
import type { StoredStation } from '../types/station';

const storedStation: StoredStation = {
  stationuuid: 'station-a',
  name: 'Storage Test Radio',
  url: 'https://example.com/live.mp3',
  url_resolved: 'https://example.com/live.mp3',
  country: 'Japan',
  language: 'japanese',
  codec: 'MP3',
  bitrate: 128,
  hls: 0,
  lastcheckok: 1,
  ssl_error: 0
};

describe('global radio local storage persistence', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not crash the app when localStorage writes are unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(() => saveFavoriteStations([storedStation])).not.toThrow();
    expect(() => saveRecentStations([storedStation])).not.toThrow();
    expect(() =>
      saveGlobalRadioSettings({
        preferHttps: true,
        hideLowQuality: false,
        showYouTubeAlternates: true,
        alarmEnabled: true,
        alarmHour: 7,
        alarmMinute: 30,
        alarmStation: storedStation
      })
    ).not.toThrow();
  });
});
