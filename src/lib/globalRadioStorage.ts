import { DEFAULT_RADIO_ALARM } from './radioAlarm';
import type { GlobalRadioSettings, RadioAlarmSettings, RadioStation, StoredStation } from '../types/station';

export const FAVORITES_STORAGE_KEY = 'global-radio-pwa:favorites:v1';
export const RECENT_STORAGE_KEY = 'global-radio-pwa:recent:v1';
export const SETTINGS_STORAGE_KEY = 'global-radio-pwa:settings:v1';
export const ALARM_STORAGE_KEY = 'global-radio-pwa:alarm:v1';

export const DEFAULT_GLOBAL_RADIO_SETTINGS: GlobalRadioSettings = {
  preferHttps: true,
  hideLowQuality: false,
  showYouTubeAlternates: true
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const item = window.localStorage.getItem(key);
    if (!item) {
      return fallback;
    }

    return JSON.parse(item) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function toStoredStation(station: RadioStation): StoredStation {
  return {
    stationuuid: station.stationuuid,
    name: station.name,
    url: station.url,
    url_resolved: station.url_resolved,
    favicon: station.favicon,
    country: station.country,
    countrycode: station.countrycode,
    language: station.language,
    tags: station.tags,
    codec: station.codec,
    bitrate: station.bitrate,
    hls: station.hls,
    lastcheckok: station.lastcheckok,
    ssl_error: station.ssl_error,
    votes: station.votes,
    clickcount: station.clickcount,
    source: station.source
  };
}

export function loadFavoriteStations(): StoredStation[] {
  return readJson<StoredStation[]>(FAVORITES_STORAGE_KEY, []);
}

export function saveFavoriteStations(stations: StoredStation[]): void {
  writeJson(FAVORITES_STORAGE_KEY, stations);
}

export function loadRecentStations(): StoredStation[] {
  return readJson<StoredStation[]>(RECENT_STORAGE_KEY, []);
}

export function saveRecentStations(stations: StoredStation[]): void {
  writeJson(RECENT_STORAGE_KEY, stations.slice(0, 20));
}

export function loadGlobalRadioSettings(): GlobalRadioSettings {
  return {
    ...DEFAULT_GLOBAL_RADIO_SETTINGS,
    ...readJson<Partial<GlobalRadioSettings>>(SETTINGS_STORAGE_KEY, {})
  };
}

export function saveGlobalRadioSettings(settings: GlobalRadioSettings): void {
  writeJson(SETTINGS_STORAGE_KEY, settings);
}

export function loadRadioAlarmSettings(): RadioAlarmSettings {
  return {
    ...DEFAULT_RADIO_ALARM,
    ...readJson<Partial<RadioAlarmSettings>>(ALARM_STORAGE_KEY, {})
  };
}

export function saveRadioAlarmSettings(alarm: RadioAlarmSettings): void {
  writeJson(ALARM_STORAGE_KEY, alarm);
}

export function upsertStoredStation(stations: StoredStation[], station: RadioStation): StoredStation[] {
  const next = toStoredStation(station);
  return [next, ...stations.filter((item) => item.stationuuid !== station.stationuuid)];
}
