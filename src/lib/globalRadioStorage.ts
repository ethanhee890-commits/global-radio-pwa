import type { GlobalRadioSettings, RadioStation, StoredStation } from '../types/station';
import { getSafeHttpsUrl, getSafeNetworkUrl } from './urlSafety';

export const FAVORITES_STORAGE_KEY = 'global-radio-pwa:favorites:v1';
export const RECENT_STORAGE_KEY = 'global-radio-pwa:recent:v1';
export const SETTINGS_STORAGE_KEY = 'global-radio-pwa:settings:v1';

export const DEFAULT_GLOBAL_RADIO_SETTINGS: GlobalRadioSettings = {
  preferHttps: true,
  hideLowQuality: false,
  showYouTubeAlternates: true,
  alarmEnabled: false,
  alarmHour: 7,
  alarmMinute: 0
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

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
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable or quota-limited in some mobile/private browsing contexts.
  }
}

export function toStoredStation(station: RadioStation): StoredStation {
  const url = getSafeNetworkUrl(station.url);
  const urlResolved = getSafeNetworkUrl(station.url_resolved) || url;
  const favicon = getSafeHttpsUrl(station.favicon) || undefined;

  return {
    stationuuid: station.stationuuid,
    name: station.name,
    url,
    url_resolved: urlResolved,
    favicon,
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

function sanitizeStoredStation(value: unknown): StoredStation | null {
  if (!isRecord(value)) {
    return null;
  }

  const stationuuid = typeof value.stationuuid === 'string' ? value.stationuuid.trim() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const url = getSafeNetworkUrl(value.url);
  const urlResolved = getSafeNetworkUrl(value.url_resolved) || url;

  if (!stationuuid || !name || !url) {
    return null;
  }

  return {
    stationuuid,
    name,
    url,
    url_resolved: urlResolved,
    favicon: getSafeHttpsUrl(value.favicon) || undefined,
    country: typeof value.country === 'string' ? value.country : undefined,
    countrycode: typeof value.countrycode === 'string' ? value.countrycode : undefined,
    language: typeof value.language === 'string' ? value.language : undefined,
    tags: typeof value.tags === 'string' ? value.tags : undefined,
    codec: typeof value.codec === 'string' ? value.codec : undefined,
    bitrate: Number(value.bitrate ?? 0),
    hls: value.hls === 1 ? 1 : 0,
    lastcheckok: value.lastcheckok === 0 ? 0 : value.lastcheckok === 1 ? 1 : undefined,
    ssl_error: value.ssl_error === 1 ? 1 : 0,
    votes: Number(value.votes ?? 0),
    clickcount: Number(value.clickcount ?? 0),
    source: value.source === 'radio-browser' || value.source === 'seed' ? value.source : undefined
  };
}

export function loadFavoriteStations(): StoredStation[] {
  return readJson<unknown[]>(FAVORITES_STORAGE_KEY, []).map(sanitizeStoredStation).filter((station): station is StoredStation => Boolean(station));
}

export function saveFavoriteStations(stations: StoredStation[]): void {
  writeJson(FAVORITES_STORAGE_KEY, stations);
}

export function loadRecentStations(): StoredStation[] {
  return readJson<unknown[]>(RECENT_STORAGE_KEY, []).map(sanitizeStoredStation).filter((station): station is StoredStation => Boolean(station));
}

export function saveRecentStations(stations: StoredStation[]): void {
  writeJson(RECENT_STORAGE_KEY, stations.slice(0, 20));
}

export function loadGlobalRadioSettings(): GlobalRadioSettings {
  const stored = readJson<Partial<Record<keyof GlobalRadioSettings, unknown>>>(SETTINGS_STORAGE_KEY, {});
  const alarmHour = typeof stored.alarmHour === 'number' && stored.alarmHour >= 0 && stored.alarmHour <= 23 ? Math.floor(stored.alarmHour) : DEFAULT_GLOBAL_RADIO_SETTINGS.alarmHour;
  const alarmMinute =
    typeof stored.alarmMinute === 'number' && stored.alarmMinute >= 0 && stored.alarmMinute <= 59 ? Math.floor(stored.alarmMinute) : DEFAULT_GLOBAL_RADIO_SETTINGS.alarmMinute;
  const alarmStation = sanitizeStoredStation(stored.alarmStation);

  return {
    preferHttps: typeof stored.preferHttps === 'boolean' ? stored.preferHttps : DEFAULT_GLOBAL_RADIO_SETTINGS.preferHttps,
    hideLowQuality: typeof stored.hideLowQuality === 'boolean' ? stored.hideLowQuality : DEFAULT_GLOBAL_RADIO_SETTINGS.hideLowQuality,
    showYouTubeAlternates:
      typeof stored.showYouTubeAlternates === 'boolean' ? stored.showYouTubeAlternates : DEFAULT_GLOBAL_RADIO_SETTINGS.showYouTubeAlternates,
    alarmEnabled: typeof stored.alarmEnabled === 'boolean' ? stored.alarmEnabled && Boolean(alarmStation) : DEFAULT_GLOBAL_RADIO_SETTINGS.alarmEnabled,
    alarmHour,
    alarmMinute,
    alarmStation: alarmStation ?? undefined
  };
}

export function saveGlobalRadioSettings(settings: GlobalRadioSettings): void {
  writeJson(SETTINGS_STORAGE_KEY, settings);
}

export function upsertStoredStation(stations: StoredStation[], station: RadioStation): StoredStation[] {
  const next = toStoredStation(station);
  return [next, ...stations.filter((item) => item.stationuuid !== station.stationuuid)];
}
