import { FALLBACK_STATIONS } from '../data/youtubeAlternates.seed';
import type { RadioStation, SearchStationsParams } from '../types/station';
import { compareStationsByQuality } from './qualityScore';

const RADIO_BROWSER_ENDPOINTS = [
  'https://de1.api.radio-browser.info',
  'https://de2.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://all.api.radio-browser.info'
];

const REQUEST_TIMEOUT_MS = 6000;
const FEATURED_COUNTRY_CODES = ['JP', 'KR', 'US', 'GB', 'DE', 'FR', 'CA', 'AU', 'NL', 'BR', 'ES', 'IT', 'TW', 'SG'];
const JAPAN_PRIORITY_COUNTRY_CODE = 'JP';

type RadioBrowserStation = Partial<RadioStation> & Record<string, unknown>;

function normalizeFavicon(favicon: unknown): string | undefined {
  if (typeof favicon !== 'string') {
    return undefined;
  }

  const trimmed = favicon.trim();
  return trimmed.startsWith('https://') || trimmed.startsWith('data:') ? trimmed : undefined;
}

function normalizeStation(item: RadioBrowserStation): RadioStation | null {
  const stationuuid = String(item.stationuuid ?? '').trim();
  const name = String(item.name ?? '').trim();
  const url = String(item.url ?? item.url_resolved ?? '').trim();

  if (!stationuuid || !name || !url) {
    return null;
  }

  return {
    stationuuid,
    name,
    url,
    url_resolved: typeof item.url_resolved === 'string' ? item.url_resolved : url,
    homepage: typeof item.homepage === 'string' ? item.homepage : undefined,
    favicon: normalizeFavicon(item.favicon),
    tags: typeof item.tags === 'string' ? item.tags : undefined,
    country: typeof item.country === 'string' ? item.country : undefined,
    countrycode: typeof item.countrycode === 'string' ? item.countrycode : undefined,
    language: typeof item.language === 'string' ? item.language : undefined,
    codec: typeof item.codec === 'string' ? item.codec : undefined,
    bitrate: Number(item.bitrate ?? 0),
    hls: item.hls === 1 ? 1 : 0,
    lastcheckok: item.lastcheckok === 1 ? 1 : 0,
    ssl_error: item.ssl_error === 1 ? 1 : 0,
    votes: Number(item.votes ?? 0),
    clickcount: Number(item.clickcount ?? 0),
    source: 'radio-browser'
  };
}

function matchesFallback(station: RadioStation, params: SearchStationsParams): boolean {
  const query = params.query?.trim().toLowerCase();
  const country = params.country?.trim().toLowerCase();
  const language = params.language?.trim().toLowerCase();
  const tag = params.tag?.trim().toLowerCase();
  const searchable = [station.name, station.country, station.countrycode, station.language, station.tags].join(' ').toLowerCase();

  return (
    (!query || searchable.includes(query)) &&
    (!country ||
      String(station.country ?? '').toLowerCase().includes(country) ||
      String(station.countrycode ?? '').toLowerCase() === country ||
      countryAliasesFor(station.countrycode).includes(country)) &&
    (!language || String(station.language ?? '').toLowerCase().includes(language)) &&
    (!tag || String(station.tags ?? '').toLowerCase().includes(tag))
  );
}

function countryAliasesFor(countrycode?: string): string[] {
  const code = String(countrycode ?? '').toUpperCase();
  const aliases: Record<string, string[]> = {
    AU: ['australia'],
    BR: ['brazil'],
    CA: ['canada'],
    DE: ['germany'],
    ES: ['spain'],
    FR: ['france'],
    GB: ['united kingdom', 'uk', 'great britain'],
    IT: ['italy'],
    JP: ['japan', 'japanese', '일본'],
    KR: ['korea', 'south korea', 'republic of korea', '한국'],
    NL: ['netherlands'],
    SG: ['singapore'],
    TW: ['taiwan']
  };

  return aliases[code] ?? [];
}

function normalizeCountryParam(country?: string): { key: 'country' | 'countrycode'; value: string } | null {
  const value = country?.trim();
  if (!value) {
    return null;
  }

  const upperValue = value.toUpperCase();
  if (/^[A-Z]{2}$/.test(upperValue)) {
    return { key: 'countrycode', value: upperValue };
  }

  return { key: 'country', value };
}

function buildSearchUrl(baseUrl: string, params: SearchStationsParams): string {
  const query = new URLSearchParams({
    hidebroken: 'true',
    limit: String(params.limit ?? 60),
    order: 'votes',
    reverse: 'true'
  });

  if (params.query?.trim()) {
    query.set('name', params.query.trim());
  }
  const countryParam = normalizeCountryParam(params.country);
  if (countryParam) {
    query.set(countryParam.key, countryParam.value);
  }
  if (params.language?.trim()) {
    query.set('language', params.language.trim());
  }
  if (params.tag?.trim()) {
    query.set('tag', params.tag.trim());
  }

  return `${baseUrl}/json/stations/search?${query.toString()}`;
}

function isDefaultDiscoverySearch(params: SearchStationsParams): boolean {
  return !params.query?.trim() && !params.country?.trim() && !params.language?.trim() && !params.tag?.trim();
}

export function getFallbackStations(params: SearchStationsParams = {}): RadioStation[] {
  const filtered = FALLBACK_STATIONS.filter((station) => matchesFallback(station, params));
  const hasSearchScope = Boolean(params.query?.trim() || params.country?.trim() || params.language?.trim() || params.tag?.trim());

  if (filtered.length > 0) {
    return filtered.sort(compareStationsByQuality);
  }

  return hasSearchScope ? [] : FALLBACK_STATIONS.slice().sort(compareStationsByQuality);
}

async function fetchStationsFromEndpoint(endpoint: string, params: SearchStationsParams): Promise<RadioStation[]> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildSearchUrl(endpoint, params), {
      headers: {
        Accept: 'application/json'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Radio Browser request failed: ${response.status}`);
    }

    const payload = (await response.json()) as RadioBrowserStation[];
    return payload
      .map(normalizeStation)
      .filter((station): station is RadioStation => Boolean(station))
      .sort(compareStationsByQuality);
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

function mergeStations(stations: RadioStation[], fallbackMatches: RadioStation[]): RadioStation[] {
  const stationIds = new Set<string>();
  const streamUrls = new Set<string>();
  const nameCountryKeys = new Set<string>();
  const merged: RadioStation[] = [];

  for (const station of [...fallbackMatches, ...stations]) {
    const streamUrl = String(station.url_resolved || station.url).trim().toLowerCase().replace(/\/+$/, '');
    const nameCountryKey = `${station.name.trim().toLowerCase()}::${String(station.countrycode ?? station.country ?? '').trim().toLowerCase()}`;

    if (stationIds.has(station.stationuuid) || streamUrls.has(streamUrl) || nameCountryKeys.has(nameCountryKey)) {
      continue;
    }

    stationIds.add(station.stationuuid);
    streamUrls.add(streamUrl);
    nameCountryKeys.add(nameCountryKey);
    merged.push(station);
  }

  return merged.sort((a, b) => {
    const japanPriorityA = a.countrycode === JAPAN_PRIORITY_COUNTRY_CODE ? 6 : 0;
    const japanPriorityB = b.countrycode === JAPAN_PRIORITY_COUNTRY_CODE ? 6 : 0;
    const byQuality = compareStationsByQuality({ ...a, bitrate: Number(a.bitrate ?? 0) + japanPriorityA }, { ...b, bitrate: Number(b.bitrate ?? 0) + japanPriorityB });

    if (byQuality !== 0) {
      return byQuality;
    }

    return Number(b.votes ?? 0) - Number(a.votes ?? 0);
  });
}

async function searchFeaturedStations(): Promise<RadioStation[]> {
  const errors: unknown[] = [];
  const fallbackMatches = getFallbackStations();

  for (const endpoint of RADIO_BROWSER_ENDPOINTS) {
    try {
      const countryBatches = await Promise.allSettled(
        FEATURED_COUNTRY_CODES.map((countryCode) =>
          fetchStationsFromEndpoint(endpoint, {
            country: countryCode,
            limit: countryCode === JAPAN_PRIORITY_COUNTRY_CODE ? 18 : 8
          })
        )
      );

      const stations = countryBatches.flatMap((batch) => (batch.status === 'fulfilled' ? batch.value : []));
      if (stations.length > 0) {
        return mergeStations(stations, fallbackMatches);
      }
    } catch (error) {
      errors.push(error);
    }
  }

  console.warn('Radio Browser featured discovery unavailable. Falling back to seed stations.', errors);
  return fallbackMatches;
}

export async function searchStations(params: SearchStationsParams = {}): Promise<RadioStation[]> {
  if (isDefaultDiscoverySearch(params)) {
    return searchFeaturedStations();
  }

  const errors: unknown[] = [];

  for (const endpoint of RADIO_BROWSER_ENDPOINTS) {
    try {
      const stations = await fetchStationsFromEndpoint(endpoint, params);
      const fallbackMatches = getFallbackStations(params);
      const mergedStations = mergeStations(stations, fallbackMatches);

      return mergedStations.length > 0 ? mergedStations : getFallbackStations(params);
    } catch (error) {
      errors.push(error);
    }
  }

  console.warn('Radio Browser API unavailable. Falling back to seed stations.', errors);
  return getFallbackStations(params);
}
