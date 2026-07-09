import { FALLBACK_STATIONS } from '../data/youtubeAlternates.seed';
import type { RadioStation, SearchStationsParams } from '../types/station';
import { compareStationsByQuality } from './qualityScore';
import { getSafeHttpsUrl, getSafeNetworkUrl } from './urlSafety';

const RADIO_BROWSER_ENDPOINTS = [
  'https://de1.api.radio-browser.info',
  'https://de2.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://all.api.radio-browser.info'
];

const REQUEST_TIMEOUT_MS = 6000;
const TAG_OPTION_LIMIT = 120;

type RadioBrowserStation = Partial<RadioStation> & Record<string, unknown>;
type RadioBrowserMetaItem = Record<string, unknown>;

export type RadioBrowserFilterOption = {
  label: string;
  value: string;
  stationcount?: number;
};

export type RadioBrowserFilterOptions = {
  countries: RadioBrowserFilterOption[];
  languages: RadioBrowserFilterOption[];
  tags: RadioBrowserFilterOption[];
  source: 'radio-browser' | 'fallback';
};

const ALL_OPTION: RadioBrowserFilterOption = { label: '전체', value: '' };

const FALLBACK_COUNTRY_OPTIONS: RadioBrowserFilterOption[] = [
  ALL_OPTION,
  { label: '대한민국 (KR)', value: 'KR' },
  { label: '일본 (JP)', value: 'JP' },
  { label: '미국 (US)', value: 'US' },
  { label: '영국 (GB)', value: 'GB' },
  { label: '독일 (DE)', value: 'DE' },
  { label: '프랑스 (FR)', value: 'FR' },
  { label: '스페인 (ES)', value: 'ES' },
  { label: '이탈리아 (IT)', value: 'IT' },
  { label: '네덜란드 (NL)', value: 'NL' },
  { label: '캐나다 (CA)', value: 'CA' },
  { label: '호주 (AU)', value: 'AU' },
  { label: '브라질 (BR)', value: 'BR' },
  { label: '멕시코 (MX)', value: 'MX' },
  { label: '아르헨티나 (AR)', value: 'AR' },
  { label: '중국 (CN)', value: 'CN' },
  { label: '대만 (TW)', value: 'TW' },
  { label: '폴란드 (PL)', value: 'PL' },
  { label: '스웨덴 (SE)', value: 'SE' },
  { label: '노르웨이 (NO)', value: 'NO' },
  { label: '덴마크 (DK)', value: 'DK' },
  { label: '핀란드 (FI)', value: 'FI' },
  { label: '인도 (IN)', value: 'IN' },
  { label: '인도네시아 (ID)', value: 'ID' },
  { label: '태국 (TH)', value: 'TH' },
  { label: '베트남 (VN)', value: 'VN' },
  { label: '튀르키예 (TR)', value: 'TR' },
  { label: '남아프리카공화국 (ZA)', value: 'ZA' }
];

const FALLBACK_LANGUAGE_OPTIONS: RadioBrowserFilterOption[] = [
  ALL_OPTION,
  { label: '한국어', value: 'korean' },
  { label: '영어', value: 'english' },
  { label: '일본어', value: 'japanese' },
  { label: '중국어', value: 'chinese' },
  { label: '스페인어', value: 'spanish' },
  { label: '독일어', value: 'german' },
  { label: '프랑스어', value: 'french' },
  { label: '이탈리아어', value: 'italian' },
  { label: '포르투갈어', value: 'portuguese' },
  { label: '러시아어', value: 'russian' },
  { label: '아랍어', value: 'arabic' },
  { label: '힌디어', value: 'hindi' },
  { label: '인도네시아어', value: 'indonesian' },
  { label: '태국어', value: 'thai' },
  { label: '베트남어', value: 'vietnamese' }
];

const FALLBACK_TAG_OPTIONS: RadioBrowserFilterOption[] = [
  ALL_OPTION,
  { label: 'Jazz', value: 'jazz' },
  { label: '페스티벌/라이브', value: 'festival' },
  { label: 'News', value: 'news' },
  { label: 'Pop', value: 'pop' },
  { label: 'Rock', value: 'rock' },
  { label: 'Classical', value: 'classical' },
  { label: 'Talk', value: 'talk' },
  { label: 'Lofi', value: 'lofi' },
  { label: 'Dance', value: 'dance' },
  { label: 'Electronic', value: 'electronic' },
  { label: 'Hip Hop', value: 'hip hop' },
  { label: 'Public Radio', value: 'public radio' },
  { label: 'Sports', value: 'sports' }
];

function normalizeStation(item: RadioBrowserStation): RadioStation | null {
  const stationuuid = String(item.stationuuid ?? '').trim();
  const name = String(item.name ?? '').trim();
  const url = getSafeNetworkUrl(item.url) || getSafeNetworkUrl(item.url_resolved);
  const urlResolved = getSafeNetworkUrl(item.url_resolved) || url;

  if (!stationuuid || !name || !url) {
    return null;
  }

  return {
    stationuuid,
    name,
    url,
    url_resolved: urlResolved,
    homepage: getSafeNetworkUrl(item.homepage) || undefined,
    favicon: getSafeHttpsUrl(item.favicon) || undefined,
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

function toCount(value: unknown): number {
  const count = Number(value ?? 0);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function toTitleLabel(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ');
}

function normalizeCountryOptions(items: RadioBrowserMetaItem[]): RadioBrowserFilterOption[] {
  const seen = new Set<string>();
  const options = items
    .map((item): RadioBrowserFilterOption | null => {
      const countryCode = String(item.iso_3166_1 ?? '').trim().toUpperCase();
      const name = String(item.name ?? '').trim();
      const stationcount = toCount(item.stationcount);

      if (!countryCode || countryCode.length !== 2 || !name || seen.has(countryCode)) {
        return null;
      }

      seen.add(countryCode);
      return {
        label: `${name} (${countryCode})`,
        value: countryCode,
        stationcount
      };
    })
    .filter((option): option is RadioBrowserFilterOption => Boolean(option))
    .sort((a, b) => Number(b.stationcount ?? 0) - Number(a.stationcount ?? 0));

  return [ALL_OPTION, ...options];
}

function normalizeLanguageOptions(items: RadioBrowserMetaItem[]): RadioBrowserFilterOption[] {
  const seen = new Set<string>();
  const options = items
    .map((item): RadioBrowserFilterOption | null => {
      const name = String(item.name ?? '').trim().toLowerCase();
      const stationcount = toCount(item.stationcount);

      if (!name || name.length > 40 || seen.has(name)) {
        return null;
      }

      seen.add(name);
      return {
        label: toTitleLabel(name),
        value: name,
        stationcount
      };
    })
    .filter((option): option is RadioBrowserFilterOption => Boolean(option))
    .sort((a, b) => Number(b.stationcount ?? 0) - Number(a.stationcount ?? 0));

  return [ALL_OPTION, ...options];
}

function normalizeTagOptions(items: RadioBrowserMetaItem[]): RadioBrowserFilterOption[] {
  const seen = new Set<string>();
  const options = items
    .map((item): RadioBrowserFilterOption | null => {
      const name = String(item.name ?? '').trim().toLowerCase();
      const stationcount = toCount(item.stationcount);

      if (!name || name.length > 36 || seen.has(name)) {
        return null;
      }

      seen.add(name);
      return {
        label: toTitleLabel(name),
        value: name,
        stationcount
      };
    })
    .filter((option): option is RadioBrowserFilterOption => Boolean(option))
    .sort((a, b) => Number(b.stationcount ?? 0) - Number(a.stationcount ?? 0))
    .slice(0, TAG_OPTION_LIMIT);

  return [ALL_OPTION, ...options];
}

function buildMetadataUrl(baseUrl: string, resource: 'countries' | 'languages' | 'tags'): string {
  const query = new URLSearchParams({
    order: 'stationcount',
    reverse: 'true'
  });

  if (resource === 'tags') {
    query.set('limit', String(TAG_OPTION_LIMIT));
  }

  return `${baseUrl}/json/${resource}?${query.toString()}`;
}

async function fetchMetadataList(baseUrl: string, resource: 'countries' | 'languages' | 'tags'): Promise<RadioBrowserMetaItem[]> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildMetadataUrl(baseUrl, resource), {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Radio Browser ${resource} request failed: ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as RadioBrowserMetaItem[]) : [];
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function getFallbackFilterOptions(): RadioBrowserFilterOptions {
  return {
    countries: FALLBACK_COUNTRY_OPTIONS,
    languages: FALLBACK_LANGUAGE_OPTIONS,
    tags: FALLBACK_TAG_OPTIONS,
    source: 'fallback'
  };
}

export async function loadRadioBrowserFilterOptions(): Promise<RadioBrowserFilterOptions> {
  for (const endpoint of RADIO_BROWSER_ENDPOINTS) {
    try {
      const [countries, languages, tags] = await Promise.all([
        fetchMetadataList(endpoint, 'countries'),
        fetchMetadataList(endpoint, 'languages'),
        fetchMetadataList(endpoint, 'tags')
      ]);
      const options = {
        countries: normalizeCountryOptions(countries),
        languages: normalizeLanguageOptions(languages),
        tags: normalizeTagOptions(tags),
        source: 'radio-browser' as const
      };

      if (options.countries.length > 1 && options.languages.length > 1 && options.tags.length > 1) {
        return options;
      }
    } catch {
      // Try the next Radio Browser mirror.
    }
  }

  return getFallbackFilterOptions();
}

function matchesFallback(station: RadioStation, params: SearchStationsParams): boolean {
  const query = params.query?.trim().toLowerCase();
  const country = params.country?.trim().toLowerCase();
  const language = params.language?.trim().toLowerCase();
  const tag = params.tag?.trim().toLowerCase();
  const searchable = [station.name, station.country, station.countrycode, station.language, station.tags].join(' ').toLowerCase();

  return (
    (!query || searchable.includes(query)) &&
    (!country || String(station.country ?? '').toLowerCase().includes(country) || String(station.countrycode ?? '').toLowerCase() === country) &&
    (!language || String(station.language ?? '').toLowerCase().includes(language)) &&
    (!tag || String(station.tags ?? '').toLowerCase().includes(tag))
  );
}

export function buildSearchUrl(baseUrl: string, params: SearchStationsParams): string {
  const query = new URLSearchParams({
    hidebroken: 'true',
    limit: String(params.limit ?? 60),
    order: 'votes',
    reverse: 'true'
  });

  if (params.query?.trim()) {
    query.set('name', params.query.trim());
  }
  if (params.country?.trim()) {
    const country = params.country.trim();
    if (/^[a-z]{2}$/i.test(country)) {
      query.set('countrycode', country.toUpperCase());
    } else {
      query.set('country', country);
    }
  }
  if (params.language?.trim()) {
    query.set('language', params.language.trim());
  }
  if (params.tag?.trim()) {
    query.set('tag', params.tag.trim());
  }

  return `${baseUrl}/json/stations/search?${query.toString()}`;
}

export function getFallbackStations(params: SearchStationsParams = {}): RadioStation[] {
  const filtered = FALLBACK_STATIONS.filter((station) => matchesFallback(station, params));
  const hasSearchScope = Boolean(params.query?.trim() || params.country?.trim() || params.language?.trim() || params.tag?.trim());

  if (filtered.length > 0) {
    return filtered.sort(compareStationsByQuality);
  }

  return hasSearchScope ? [] : FALLBACK_STATIONS.slice().sort(compareStationsByQuality);
}

export async function searchStations(params: SearchStationsParams = {}): Promise<RadioStation[]> {
  const errors: unknown[] = [];

  for (const endpoint of RADIO_BROWSER_ENDPOINTS) {
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

      const payload = (await response.json()) as unknown;
      const items = Array.isArray(payload) ? (payload as RadioBrowserStation[]) : [];
      const stations = items
        .map(normalizeStation)
        .filter((station): station is RadioStation => Boolean(station))
        .sort(compareStationsByQuality);

      const fallbackMatches = getFallbackStations(params);
      const stationIds = new Set(stations.map((station) => station.stationuuid));
      const mergedStations = [...stations, ...fallbackMatches.filter((station) => !stationIds.has(station.stationuuid))];

      return mergedStations.length > 0 ? mergedStations.sort(compareStationsByQuality) : getFallbackStations(params);
    } catch (error) {
      errors.push(error);
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }

  console.warn('Radio Browser API unavailable. Falling back to seed stations.', errors);
  return getFallbackStations(params);
}
