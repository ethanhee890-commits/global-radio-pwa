import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Bell, BellOff, Clock3, Heart, Loader2, Play, Radio, RotateCcw, Search, Settings, X } from 'lucide-react';
import { getYouTubeAlternateForStation } from './data/youtubeAlternates.seed';
import { compareStationsByQuality, scoreStationQuality } from './lib/qualityScore';
import { getFallbackFilterOptions, loadRadioBrowserFilterOptions, searchStations, type RadioBrowserFilterOption } from './lib/radioBrowser';
import {
  loadFavoriteStations,
  loadGlobalRadioSettings,
  loadRecentStations,
  saveFavoriteStations,
  saveGlobalRadioSettings,
  saveRecentStations,
  toStoredStation,
  upsertStoredStation
} from './lib/globalRadioStorage';
import {
  canUseNativeNotifications,
  canUseNativeRadioPlayback,
  cancelRadioAlarm,
  listenForRadioAlarmActions,
  openNativeAlarmSettings,
  ensureNotificationPermission,
  getNativePlatform,
  getNativeRadioStatus,
  pauseNativeRadio,
  playNativeRadio,
  scheduleRadioAlarm,
  stopNativeRadio
} from './lib/nativeRadio';
import type { GlobalRadioSettings, PlaybackStatus, RadioStation, StoredStation } from './types/station';
import { DirectAudioPlayer } from './components/DirectAudioPlayer';
import { FilterBar, type RadioFilters } from './components/FilterBar';
import { AppSplash } from './components/AppSplash';
import { MiniPlayer } from './components/MiniPlayer';
import { SearchBar } from './components/SearchBar';
import { StationCard } from './components/StationCard';
import { StationDetail } from './components/StationDetail';
import { PermissionPrompt, type PermissionPromptKind } from './components/PermissionPrompt';
import { Toast, type ToastState } from './components/Toast';
import './global-radio.css';
import { getSafeNetworkUrl } from './lib/urlSafety';
import { getPublicAssetUrl } from './lib/publicAssets';

type ViewKey = 'discover' | 'favorites' | 'recent' | 'settings';

const DEFAULT_FILTERS: RadioFilters = {
  country: '',
  language: '',
  tag: '',
  sort: 'quality'
};

const JAPAN_PRIORITY_FILTERS: RadioFilters = {
  country: 'JP',
  language: 'japanese',
  tag: 'japan-priority',
  sort: 'quality'
};

const appIconUrl = getPublicAssetUrl('icons/app-icon.png');

type CountryAliasSet = {
  exact?: string[];
  contains?: string[];
};

const COUNTRY_QUERY_ALIASES: Record<string, CountryAliasSet> = {
  AU: { exact: ['australia'] },
  BR: { exact: ['brazil'] },
  CA: { exact: ['canada'] },
  CN: { exact: ['china'], contains: ['mainland china'] },
  DE: { exact: ['germany'] },
  ES: { exact: ['spain'] },
  FR: { exact: ['france'] },
  GB: { exact: ['uk', 'britain'], contains: ['united kingdom', 'great britain'] },
  IT: { exact: ['italy'] },
  JP: { exact: ['japan', '\uC77C\uBCF8', '\u65E5\u672C'] },
  KP: { exact: ['dprk', '\uBD81\uD55C'], contains: ['north korea'] },
  KR: { exact: ['korea', '\uD55C\uAD6D', '\uB300\uD55C\uBBFC\uAD6D'], contains: ['south korea', 'republic of korea'] },
  NL: { exact: ['netherlands', 'holland'] },
  SG: { exact: ['singapore'] },
  TW: { exact: ['taiwan', '\uB300\uB9CC', '\uD0C0\uC774\uC644'] },
  US: { exact: ['usa', 'america'], contains: ['united states', 'united states of america'] }
};

function normalizeSearchToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/·.*$/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9가-힣ぁ-んァ-ン一-龥]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getRegionName(countryCode: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(countryCode) ?? '';
  } catch {
    return '';
  }
}

function queryContainsTerm(query: string, term: string): boolean {
  if (!term) {
    return false;
  }

  if (query === term) {
    return true;
  }

  if (term.includes(' ')) {
    return query.includes(term);
  }

  return query.split(' ').includes(term);
}

function matchesCountryAlias(countryCode: string, query: string): boolean {
  const aliases = COUNTRY_QUERY_ALIASES[countryCode];
  if (!aliases) {
    return false;
  }

  const exactAliases = (aliases.exact ?? []).map(normalizeSearchToken);
  if (exactAliases.includes(query)) {
    return true;
  }

  const containsAliases = (aliases.contains ?? []).map(normalizeSearchToken);
  if (containsAliases.some((term) => queryContainsTerm(query, term))) {
    return true;
  }

  if (countryCode === 'KR' && queryContainsTerm(query, 'north korea')) {
    return false;
  }

  return exactAliases.some((term) => queryContainsTerm(query, term));
}

function inferCountryFromQuery(query: string, countries: RadioBrowserFilterOption[]): string {
  const normalizedQuery = normalizeSearchToken(query);
  if (normalizedQuery.length < 2) {
    return '';
  }

  const aliasMatchedCountry = countries.find((country) => country.value && matchesCountryAlias(country.value.toUpperCase(), normalizedQuery));
  if (aliasMatchedCountry) {
    return aliasMatchedCountry.value.toUpperCase();
  }

  for (const country of countries) {
    if (!country.value) {
      continue;
    }

    const code = country.value.toUpperCase();
    const labelWithoutCount = country.label.split('·')[0] ?? country.label;
    const labelWithoutCode = labelWithoutCount.replace(/\([A-Z]{2}\)/i, '');
    const terms = [
      code,
      country.value,
      labelWithoutCount,
      labelWithoutCode,
      getRegionName(code, 'en'),
      getRegionName(code, 'ko'),
      getRegionName(code, 'ja'),
      getRegionName(code, 'es'),
      getRegionName(code, 'fr'),
      getRegionName(code, 'de')
    ].map(normalizeSearchToken);

    if (terms.some((term) => queryContainsTerm(normalizedQuery, term))) {
      return code;
    }
  }

  return '';
}

function alignFiltersWithQuery(filters: RadioFilters, query: string, countries: RadioBrowserFilterOption[]): RadioFilters {
  const inferredCountry = inferCountryFromQuery(query, countries);
  if (!inferredCountry || inferredCountry === filters.country) {
    return filters;
  }

  return {
    ...filters,
    country: inferredCountry,
    language: '',
    tag: ''
  };
}

function getStationSearchQuery(query: string, countries: RadioBrowserFilterOption[]): string {
  return inferCountryFromQuery(query, countries) ? '' : query;
}

function getQueryAfterFilterChange(query: string, countries: RadioBrowserFilterOption[], currentFilters: RadioFilters, nextFilters: RadioFilters): string {
  const inferredCountry = inferCountryFromQuery(query, countries);
  const countryChanged = currentFilters.country !== nextFilters.country;

  if (countryChanged && inferredCountry && nextFilters.country !== inferredCountry) {
    return '';
  }

  return query;
}

// eslint-disable-next-line react-refresh/only-export-components
export const __globalRadioTestHooks = {
  inferCountryFromQuery,
  alignFiltersWithQuery,
  getStationSearchQuery,
  getQueryAfterFilterChange,
  clampTimePart,
  formatAlarmTime,
  getAlarmHelperCopy
};

function stationFromStored(station: StoredStation): RadioStation {
  return {
    ...station,
    source: station.source ?? 'seed'
  };
}

function sortStations(stations: RadioStation[], sort: RadioFilters['sort'], settings: GlobalRadioSettings): RadioStation[] {
  const visibleStations = settings.hideLowQuality
    ? stations.filter((station) => !['low', 'failed'].includes(scoreStationQuality(station).grade))
    : stations;

  const sorted = visibleStations.slice();

  if (sort === 'name') {
    return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sort === 'popular') {
    return sorted.sort((a, b) => Number(b.clickcount ?? b.votes ?? 0) - Number(a.clickcount ?? a.votes ?? 0));
  }

  return sorted.sort((a, b) => {
    const httpsBoostA = settings.preferHttps && (a.url_resolved || a.url).startsWith('https://') ? 4 : 0;
    const httpsBoostB = settings.preferHttps && (b.url_resolved || b.url).startsWith('https://') ? 4 : 0;
    const byQuality = compareStationsByQuality({ ...a, bitrate: Number(a.bitrate ?? 0) + httpsBoostA }, { ...b, bitrate: Number(b.bitrate ?? 0) + httpsBoostB });
    if (byQuality !== 0) {
      return byQuality;
    }

    return Number(b.votes ?? 0) - Number(a.votes ?? 0);
  });
}

function clampTimePart(value: number, max: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(max, Math.max(0, Math.floor(value)));
}

function formatAlarmTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getAlarmHelperCopy(platform: string): string {
  if (platform === 'android') {
    return '권한을 허용하면 설정한 시간에 선택한 방송이 자동으로 재생됩니다.';
  }

  if (platform === 'ios') {
    return '설정한 시간에 알림을 보내드려요. 알림을 탭한 뒤 앱에서 선택한 방송을 재생해 주세요.';
  }

  return '웹에서는 알람 예약을 지원하지 않아요. 알람은 Android 또는 iOS 앱에서 설정해 주세요.';
}

export default function GlobalRadioApp() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const didInitialSearchRef = useRef(false);
  const filtersRef = useRef<RadioFilters>(DEFAULT_FILTERS);
  const playbackTimerRef = useRef<number | null>(null);
  const pendingPlaybackStationRef = useRef<RadioStation | null>(null);
  const activeStationRef = useRef<RadioStation | null>(null);
  const sheetDragRef = useRef<{ startY: number; pointerId: number } | null>(null);
  const [view, setView] = useState<ViewKey>('discover');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<RadioFilters>(DEFAULT_FILTERS);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<RadioStation | null>(null);
  const [activeStation, setActiveStation] = useState<RadioStation | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [playbackError, setPlaybackError] = useState('');
  const [activeSourceType, setActiveSourceType] = useState<'radio' | 'youtube'>('radio');
  const [youtubeMountedStationId, setYoutubeMountedStationId] = useState('');
  const [favorites, setFavorites] = useState<StoredStation[]>(() => loadFavoriteStations());
  const [recent, setRecent] = useState<StoredStation[]>(() => loadRecentStations());
  const [settings, setSettings] = useState<GlobalRadioSettings>(() => loadGlobalRadioSettings());
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [playerSheetOpen, setPlayerSheetOpen] = useState(false);
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [filterOptions, setFilterOptions] = useState(() => getFallbackFilterOptions());
  const [permissionPrompt, setPermissionPrompt] = useState<PermissionPromptKind | null>(null);
  const [permissionPromptsSeen, setPermissionPromptsSeen] = useState({
    playback: false,
    alarm: false
  });
  filtersRef.current = filters;

  const favoriteIds = useMemo(() => new Set(favorites.map((station) => station.stationuuid)), [favorites]);
  const visibleStations = useMemo(() => sortStations(stations, filters.sort, settings), [stations, filters.sort, settings]);
  const favoriteStations = useMemo(() => favorites.map(stationFromStored), [favorites]);
  const recentStations = useMemo(() => recent.map(stationFromStored), [recent]);
  const latestRecentStation = recentStations[0] ?? null;
  const displayedStations = view === 'favorites' ? favoriteStations : view === 'recent' ? recentStations : visibleStations;
  const hasMountedYouTube = selectedStation?.stationuuid === youtubeMountedStationId;
  const sheetStation = activeStation ?? selectedStation;
  const sheetHasMountedYouTube = sheetStation?.stationuuid === youtubeMountedStationId;
  const playerYouTubeAlternate = sheetStation ? getYouTubeAlternateForStation(sheetStation) : null;
  const nativePlatform = getNativePlatform();
  const nativePlaybackEnabled = canUseNativeRadioPlayback();
  const nativeNotificationsEnabled = canUseNativeNotifications();
  const alarmHelperCopy = getAlarmHelperCopy(nativePlatform);
  const alarmStation = useMemo(() => (settings.alarmStation ? stationFromStored(settings.alarmStation) : null), [settings.alarmStation]);
  const alarmTimeLabel = formatAlarmTime(settings.alarmHour, settings.alarmMinute);
  const isJapanFocused =
    view === 'discover' &&
    (filters.country === 'Japan' ||
      filters.country === 'JP' ||
      filters.tag.includes('japan') ||
      filters.tag === 'terrestrial-fm' ||
      query.trim().toLowerCase().includes('japan') ||
      query.trim().toLowerCase().includes('nhk') ||
      query.includes('일본') ||
      query.includes('日本'));

  const closePlayerSheet = useCallback(() => {
    sheetDragRef.current = null;
    setSheetDragOffset(0);
    setPlayerSheetOpen(false);
  }, []);

  const loadStations = useCallback(
    async (nextFilters: RadioFilters, nextQuery: string, nextSettings = settings) => {
      setLoading(true);
      setListError('');

      try {
        const results = await searchStations({
          query: nextQuery,
          country: nextFilters.country,
          language: nextFilters.language,
          tag: nextFilters.tag,
          limit: 160
        });
        const sorted = sortStations(results, nextFilters.sort, nextSettings);
        setStations(sorted);
        setSelectedStation((current) => {
          if (current && sorted.some((station) => station.stationuuid === current.stationuuid)) {
            return current;
          }

          return sorted[0] ?? null;
        });
      } catch {
        setListError('방송국 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        setLoading(false);
      }
    },
    [settings]
  );

  useEffect(() => {
    if (!didInitialSearchRef.current) {
      didInitialSearchRef.current = true;
      void loadStations(DEFAULT_FILTERS, '');
      return;
    }

    const timer = window.setTimeout(() => {
      void loadStations(filtersRef.current, getStationSearchQuery(query, filterOptions.countries));
    }, 420);

    return () => window.clearTimeout(timer);
  }, [filterOptions.countries, filters.country, filters.language, filters.tag, loadStations, query]);

  useEffect(() => {
    let mounted = true;

    loadRadioBrowserFilterOptions()
      .then((options) => {
        if (mounted) {
          setFilterOptions(options);
        }
      })
      .catch(() => {
        if (mounted) {
          setFilterOptions(getFallbackFilterOptions());
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setFilters((current) => alignFiltersWithQuery(current, query, filterOptions.countries));
  }, [filterOptions.countries, query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowSplash(false), 1150);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    activeStationRef.current = activeStation;
  }, [activeStation]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    function handlePlaying() {
      setPlaybackStatus('playing');
      setPlaybackError('');
    }

    function handlePause() {
      setPlaybackStatus((current) => (current === 'error' || current === 'autoplay_blocked' ? current : 'paused'));
    }

    function handleError() {
      if (activeStationRef.current) {
        markStationPlaybackFailed(activeStationRef.current);
      }
      setPlaybackStatus('error');
      setPlaybackError('이 라디오는 지금 재생할 수 없어요. 다른 방송을 선택해 주세요.');
    }

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    if (!nativePlaybackEnabled || activeSourceType !== 'radio' || !activeStation) {
      return;
    }

    let cancelled = false;

    async function syncNativeStatus() {
      try {
        const nativeStatus = await getNativeRadioStatus();
        if (cancelled) {
          return;
        }

        if (['idle', 'loading', 'playing', 'paused', 'error'].includes(nativeStatus.status)) {
          setPlaybackStatus(nativeStatus.status as PlaybackStatus);
        }

        if (nativeStatus.status === 'error') {
          if (activeStation) {
            markStationPlaybackFailed(activeStation);
          }
          setPlaybackError('방송국 서버 연결 또는 스트림 재생에 실패했습니다. 다시 시도하거나 다른 방송을 선택해 주세요.');
        }
      } catch {
        if (!cancelled) {
          setPlaybackError('네이티브 재생 상태를 확인하지 못했습니다.');
        }
      }
    }

    void syncNativeStatus();
    const timer = window.setInterval(() => void syncNativeStatus(), 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeSourceType, activeStation, nativePlaybackEnabled]);

  useEffect(() => {
    if (!playerSheetOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closePlayerSheet();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePlayerSheet, playerSheetOpen]);

  useEffect(() => {
    let handle: { remove: () => Promise<void> } | null = null;
    let mounted = true;

    void listenForRadioAlarmActions((storedStation) => {
      const station = storedStation ? stationFromStored(storedStation) : alarmStation;
      if (!station) {
        showToast('알람 방송 정보를 찾지 못했습니다.', 'error');
        return;
      }

      setSelectedStation(station);
      setActiveStation(station);
      setActiveSourceType('radio');
      setView('discover');
      showToast(nativePlaybackEnabled ? '알람 방송을 불러왔습니다.' : '알림에서 방송을 열었습니다. 재생 버튼을 눌러주세요.', 'info');
    }).then((nextHandle) => {
      if (!mounted) {
        void nextHandle?.remove();
        return;
      }

      handle = nextHandle;
    });

    return () => {
      mounted = false;
      void handle?.remove();
    };
  }, [alarmStation, nativePlaybackEnabled]);

  function updateFilters(nextFilters: RadioFilters) {
    const nextQuery = getQueryAfterFilterChange(query, filterOptions.countries, filters, nextFilters);
    if (nextQuery !== query) {
      setQuery(nextQuery);
    }

    setFilters(nextFilters);
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setFilters((current) => alignFiltersWithQuery(current, nextQuery, filterOptions.countries));
  }

  function submitSearch() {
    const nextFilters = alignFiltersWithQuery(filters, query, filterOptions.countries);
    const nextStationSearchQuery = getStationSearchQuery(query, filterOptions.countries);
    setFilters(nextFilters);
    void loadStations(nextFilters, nextStationSearchQuery);
  }

  function focusJapanTag(tag: RadioFilters['tag']) {
    const nextFilters = {
      ...JAPAN_PRIORITY_FILTERS,
      tag
    };

    setQuery('');
    setFilters(nextFilters);
    void loadStations(nextFilters, '');
  }

  function showToast(message: string, tone: ToastState['tone'] = 'info') {
    setToast({ tone, message });
  }

  function markStationPlaybackFailed(station: RadioStation) {
    const failedStation: RadioStation = { ...station, lastcheckok: 0 };

    setStations((current) => current.map((item) => (item.stationuuid === station.stationuuid ? failedStation : item)));
    setSelectedStation((current) => (current?.stationuuid === station.stationuuid ? failedStation : current));
    setActiveStation((current) => (current?.stationuuid === station.stationuuid ? failedStation : current));
  }

  function confirmPermissionPrompt() {
    const kind = permissionPrompt;
    setPermissionPrompt(null);

    if (!kind) {
      return;
    }

    if (kind === 'playback') {
      setPermissionPromptsSeen((current) => ({ ...current, playback: true }));
      const station = pendingPlaybackStationRef.current;
      pendingPlaybackStationRef.current = null;
      if (station) {
        void playDirect(station, true);
      }
      return;
    }

    if (kind === 'alarm') {
      setPermissionPromptsSeen((current) => ({ ...current, alarm: true }));
      void enableAlarm(true);
      return;
    }

    void openNativeAlarmSettings();
  }

  function cancelPermissionPrompt() {
    pendingPlaybackStationRef.current = null;
    setPermissionPrompt(null);
  }

  function startSheetDrag(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) {
      return;
    }

    if ((event.target as HTMLElement).closest('button')) {
      return;
    }

    sheetDragRef.current = {
      startY: event.clientY,
      pointerId: event.pointerId
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveSheetDrag(event: PointerEvent<HTMLElement>) {
    if (sheetDragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    setSheetDragOffset(Math.max(0, event.clientY - sheetDragRef.current.startY));
  }

  function endSheetDrag(event: PointerEvent<HTMLElement>) {
    if (sheetDragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    const offset = Math.max(0, event.clientY - sheetDragRef.current.startY);
    sheetDragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (offset > 92) {
      closePlayerSheet();
      return;
    }

    setSheetDragOffset(0);
  }

  function clearPlaybackTimer() {
    if (playbackTimerRef.current) {
      window.clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }

  async function playDirect(station = selectedStation, skipPermissionPrompt = false) {
    if (!station) {
      return;
    }

    const streamUrl = getSafeNetworkUrl(station.url_resolved) || getSafeNetworkUrl(station.url);
    if (!streamUrl) {
      setSelectedStation(station);
      setActiveStation(station);
      setActiveSourceType('radio');
      setPlaybackStatus('error');
      setPlaybackError('이 방송국의 스트림 주소가 안전한 http/https 주소가 아니어서 재생하지 않았어요.');
      return;
    }

    if (!skipPermissionPrompt && nativePlaybackEnabled && !permissionPromptsSeen.playback) {
      pendingPlaybackStationRef.current = station;
      setPermissionPrompt('playback');
      return;
    }

    clearPlaybackTimer();
    setSelectedStation(station);
    setActiveStation(station);
    setActiveSourceType('radio');
    setPlaybackStatus('loading');
    setPlaybackError('');
    setYoutubeMountedStationId('');

    const audio = audioRef.current;

    if (nativePlaybackEnabled) {
      try {
        await ensureNotificationPermission();
        await playNativeRadio(station);
        setPlaybackStatus('loading');
        setPlayerSheetOpen(true);
        const nextRecent = upsertStoredStation(recent, station);
        setRecent(nextRecent);
        saveRecentStations(nextRecent);
      } catch {
        markStationPlaybackFailed(station);
        setPlaybackStatus('error');
        setPlaybackError('네이티브 라디오 재생을 시작하지 못했습니다. 다른 방송을 선택해 주세요.');
      }
      return;
    }

    if (!audio) {
      return;
    }

    audio.src = streamUrl;
    audio.load();

    playbackTimerRef.current = window.setTimeout(() => {
      if (audioRef.current && audioRef.current.readyState < 2 && playbackStatus !== 'playing') {
        audioRef.current.pause();
        markStationPlaybackFailed(station);
        setPlaybackStatus('error');
        setPlaybackError('재생 준비 시간이 길어졌어요. 다시 시도하거나 다른 방송을 선택해 주세요.');
      }
    }, 12000);

    try {
      await audio.play();
      clearPlaybackTimer();
      setPlaybackStatus('playing');
      const nextRecent = upsertStoredStation(recent, station);
      setRecent(nextRecent);
      saveRecentStations(nextRecent);
    } catch (error) {
      clearPlaybackTimer();
      const isAutoplayBlock = error instanceof DOMException && ['NotAllowedError', 'AbortError'].includes(error.name);
      if (!isAutoplayBlock) {
        markStationPlaybackFailed(station);
      }
      setPlaybackStatus(isAutoplayBlock ? 'autoplay_blocked' : 'error');
      setPlaybackError(
        isAutoplayBlock
          ? '브라우저 정책상 재생 버튼을 한 번 더 눌러주세요.'
          : '이 라디오는 지금 재생할 수 없어요. 다른 방송을 선택해 주세요.'
      );
    }
  }

  async function pauseDirect() {
    if (nativePlaybackEnabled) {
      try {
        await pauseNativeRadio();
      } catch {
        setPlaybackError('네이티브 재생을 일시정지하지 못했습니다.');
      }
    } else {
      audioRef.current?.pause();
    }
    setPlaybackStatus('paused');
  }

  function chooseYouTube(station: RadioStation) {
    const alternate = getYouTubeAlternateForStation(station);
    if (!alternate) {
      showToast('아직 확인된 공식 YouTube 방송이 없어요.', 'error');
      return;
    }

    audioRef.current?.pause();
    void stopNativeRadio();
    setSelectedStation(station);
    setActiveStation(station);
    setActiveSourceType('youtube');
    setPlaybackStatus('paused');
    setYoutubeMountedStationId(station.stationuuid);
    showToast('YouTube 플레이어를 표시했어요. 플레이어 안에서 재생을 눌러주세요.', 'success');
  }

  function toggleFavorite(station: RadioStation) {
    const exists = favoriteIds.has(station.stationuuid);
    const next = exists ? favorites.filter((item) => item.stationuuid !== station.stationuuid) : upsertStoredStation(favorites, station);
    setFavorites(next);
    saveFavoriteStations(next);
    showToast(exists ? '즐겨찾기에서 해제했어요.' : '즐겨찾기에 추가했어요.', 'success');
  }

  function updateSettings(nextSettings: GlobalRadioSettings) {
    setSettings(nextSettings);
    saveGlobalRadioSettings(nextSettings);
    showToast('설정을 저장했어요.', 'success');
  }

  function persistSettings(nextSettings: GlobalRadioSettings) {
    setSettings(nextSettings);
    saveGlobalRadioSettings(nextSettings);
  }

  function updateAlarmTime(part: 'alarmHour' | 'alarmMinute', value: string) {
    const max = part === 'alarmHour' ? 23 : 59;
    const digits = value.replace(/\D/g, '');
    persistSettings({ ...settings, [part]: clampTimePart(digits === '' ? 0 : Number(digits), max) });
  }

  async function enableAlarm(skipPermissionPrompt = false) {
    const station = activeStation ?? selectedStation;
    if (!station) {
      showToast('알람으로 재생할 방송을 먼저 선택해 주세요.', 'error');
      return;
    }

    if (!skipPermissionPrompt && canUseNativeNotifications() && !permissionPromptsSeen.alarm) {
      setPermissionPrompt('alarm');
      return;
    }

    try {
      const result = await scheduleRadioAlarm(station, settings.alarmHour, settings.alarmMinute);
      if (!result.scheduled) {
        persistSettings({ ...settings, alarmEnabled: false, alarmStation: toStoredStation(station) });
        setPermissionPrompt('alarmSettings');
        return;
      }

      persistSettings({
        ...settings,
        alarmEnabled: true,
        alarmStation: toStoredStation(station)
      });
      showToast(
        result.nativeAutoPlay
          ? `${alarmTimeLabel}에 ${station.name} 방송을 자동 재생합니다.`
          : `${alarmTimeLabel}에 알림을 보냅니다. iOS에서는 알림을 탭한 뒤 재생해 주세요.`,
        'success'
      );
    } catch {
      showToast('알람을 저장하지 못했습니다. 방송 URL과 알림 권한을 확인해 주세요.', 'error');
    }
  }

  async function disableAlarm() {
    try {
      await cancelRadioAlarm();
    } finally {
      persistSettings({ ...settings, alarmEnabled: false });
      showToast('라디오 알람을 껐습니다.', 'success');
    }
  }

  function clearRecent() {
    setRecent([]);
    saveRecentStations([]);
    showToast('최근 들은 방송을 비웠어요.', 'success');
  }

  function removeRecentStation(station: RadioStation) {
    const nextRecent = recent.filter((item) => item.stationuuid !== station.stationuuid);
    setRecent(nextRecent);
    saveRecentStations(nextRecent);
    showToast('최근 들은 방송에서 삭제했어요.', 'success');
  }

  function clearFavorites() {
    setFavorites([]);
    saveFavoriteStations([]);
    showToast('즐겨찾기를 비웠어요.', 'success');
  }

  function renderStationList() {
    if (loading) {
      return (
        <div className="station-list" aria-label="로딩 중">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="station-skeleton" key={index} />
          ))}
        </div>
      );
    }

    if (listError) {
      return (
        <div className="radio-empty-state">
          <RotateCcw aria-hidden="true" size={24} />
          <p>{listError}</p>
          <button className="radio-button secondary" type="button" onClick={() => void loadStations(filters, getStationSearchQuery(query, filterOptions.countries))}>
            다시 시도하기
          </button>
        </div>
      );
    }

    if (displayedStations.length === 0) {
      const message =
        view === 'favorites'
          ? '아직 즐겨찾기한 방송이 없어요. 마음에 드는 방송을 저장해 보세요.'
          : view === 'recent'
            ? '아직 들은 방송이 없어요. 먼저 방송국을 재생해 보세요.'
            : '검색 결과가 없어요. 다른 국가나 장르로 찾아보세요.';

      return (
        <div className="radio-empty-state">
          <Radio aria-hidden="true" size={24} />
          <p>{message}</p>
        </div>
      );
    }

    return (
      <div className="station-list">
        {displayedStations.map((station) => (
          <StationCard
            key={station.stationuuid}
            station={station}
            active={selectedStation?.stationuuid === station.stationuuid}
            isFavorite={favoriteIds.has(station.stationuuid)}
            showYouTubeAlternate={settings.showYouTubeAlternates}
            onPlay={(nextStation) => void playDirect(nextStation)}
            onSelect={setSelectedStation}
            onToggleFavorite={toggleFavorite}
            onChooseYouTube={chooseYouTube}
            onRemove={view === 'recent' ? removeRecentStation : undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`global-radio-app ${nativePlaybackEnabled ? 'is-native-radio' : ''}`}>
      <header className="global-radio-header">
        <button className="radio-brand" type="button" onClick={() => setView('discover')}>
          <span className="brand-icon" aria-hidden="true">
            <img src={appIconUrl} alt="" />
          </span>
          <span>
            <strong>지구라디오</strong>
            <small>좋은 음질로 듣는 전세계 라디오</small>
          </span>
        </button>
        <nav className="radio-nav" aria-label="지구라디오 화면">
          <button className={view === 'discover' ? 'is-active' : ''} type="button" onClick={() => setView('discover')}>
            홈
          </button>
          <button className={view === 'favorites' ? 'is-active' : ''} type="button" onClick={() => setView('favorites')}>
            즐겨찾기
          </button>
          <button className={view === 'recent' ? 'is-active' : ''} type="button" onClick={() => setView('recent')}>
            최근
          </button>
          <button className={view === 'settings' ? 'is-active' : ''} type="button" onClick={() => setView('settings')} aria-label="설정">
            <Settings aria-hidden="true" size={16} />
            설정
          </button>
        </nav>
      </header>

      <main className="global-radio-main">
        {view === 'discover' ? (
          <section className={`radio-hero ${latestRecentStation ? 'has-recent' : 'is-simple'}`}>
          <div>
            <h1>좋은 음질로 듣는 전세계 라디오</h1>
            <p>듣고 싶은 방송을 검색하면 바로 들을 수 있는 채널을 찾아드려요.</p>
          </div>
          {latestRecentStation ? (
            <div className="hero-recent-card">
              <span>최근 들은 방송</span>
              <strong>{latestRecentStation.name}</strong>
              <small>{[latestRecentStation.country, latestRecentStation.language].filter(Boolean).join(' · ') || '최근 들은 방송'}</small>
              <button className="radio-button primary hero-recent-button" type="button" onClick={() => void playDirect(latestRecentStation)}>
                <Play aria-hidden="true" size={17} />
                바로 듣기
              </button>
            </div>
          ) : null}
          </section>
        ) : null}

        {view === 'settings' ? (
          <section className="settings-panel">
            <h2>설정</h2>
            <label className="setting-row">
              <input
                type="checkbox"
                checked={settings.preferHttps}
                onChange={(event) => updateSettings({ ...settings, preferHttps: event.target.checked })}
              />
              <span>
                <strong>HTTPS 스트림 우선</strong>
                <small>보안 연결을 지원하는 라디오를 더 위에 보여줘요.</small>
              </span>
            </label>
            <label className="setting-row">
              <input
                type="checkbox"
                checked={settings.hideLowQuality}
                onChange={(event) => updateSettings({ ...settings, hideLowQuality: event.target.checked })}
              />
              <span>
                <strong>낮은 음질 숨기기</strong>
                <small>낮음/재생 실패 신호가 있는 방송을 목록에서 숨겨요.</small>
              </span>
            </label>
            <label className="setting-row">
              <input
                type="checkbox"
                checked={settings.showYouTubeAlternates}
                onChange={(event) => updateSettings({ ...settings, showYouTubeAlternates: event.target.checked })}
              />
              <span>
                <strong>YouTube로 이어 듣기 표시</strong>
                <small>공식 YouTube 방송을 확인한 채널에만 버튼을 보여줘요.</small>
              </span>
            </label>
            <section className="alarm-settings-card" aria-label="라디오 알람">
              <div className="alarm-title-row">
                <div>
                  <h3>라디오 알람</h3>
                  <p>
                    {settings.alarmEnabled && alarmStation
                      ? `${alarmTimeLabel} · ${alarmStation.name}`
                      : '선택한 방송을 지정한 시간에 들을 수 있게 준비합니다.'}
                  </p>
                </div>
                {settings.alarmEnabled ? <Bell aria-hidden="true" size={20} /> : <BellOff aria-hidden="true" size={20} />}
              </div>

              <div className="alarm-time-grid">
                <label className="alarm-time-unit">
                  <input
                    className="alarm-time-field"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label="알람 시"
                    value={String(settings.alarmHour)}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => updateAlarmTime('alarmHour', event.target.value)}
                  />
                  <span aria-hidden="true">시</span>
                </label>
                <label className="alarm-time-unit">
                  <input
                    className="alarm-time-field"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label="알람 분"
                    value={String(settings.alarmMinute)}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => updateAlarmTime('alarmMinute', event.target.value)}
                  />
                  <span aria-hidden="true">분</span>
                </label>
              </div>

              <p className="alarm-helper">{alarmHelperCopy}</p>

              <div className="settings-actions">
                <button className="radio-button primary" type="button" onClick={() => void enableAlarm()} disabled={!nativeNotificationsEnabled}>
                  <Bell aria-hidden="true" size={16} />
                  {nativeNotificationsEnabled ? '현재 방송으로 알람 설정' : '앱에서 알람 설정 가능'}
                </button>
                <button className="radio-button secondary" type="button" onClick={() => void disableAlarm()} disabled={!settings.alarmEnabled}>
                  <BellOff aria-hidden="true" size={16} />
                  알람 끄기
                </button>
                {nativePlaybackEnabled ? (
                  <button className="radio-button secondary" type="button" onClick={() => void openNativeAlarmSettings()}>
                    알람 권한
                  </button>
                ) : null}
              </div>
            </section>

          </section>
        ) : (
          <div className="radio-workspace">
            <section className="radio-list-panel">
              {view === 'discover' ? (
                <>
                  <SearchBar query={query} loading={loading} onQueryChange={updateQuery} onSubmit={submitSearch} />
                  <FilterBar filters={filters} onChange={updateFilters} options={filterOptions} />
                  {isJapanFocused ? (
                    <section className="japan-assurance-panel" aria-label="일본 방송 검증 기준">
                      <div>
                        <strong>일본 방송 우선 검증 모드</strong>
                        <p>
                          NHK WORLD-JAPAN은 공식 HTTPS HLS를 최우선으로, Shonan Beach FM과 FM Kahoku는 공식 홈페이지와
                          스트림 응답을 확인한 공개 FM 후보로 보여드려요. radiko 전용 주요 민방은 일본 내 이용 제한이 있어 우회하지
                          않습니다.
                        </p>
                      </div>
                      <div className="japan-quick-actions">
                        <button className="radio-button secondary" type="button" onClick={() => focusJapanTag('nhk')}>
                          NHK/뉴스
                        </button>
                        <button className="radio-button secondary" type="button" onClick={() => focusJapanTag('terrestrial-fm')}>
                          공개 FM
                        </button>
                      </div>
                    </section>
                  ) : null}
                </>
              ) : null}
              <div className="result-heading">
                <div>
                  <span>{view === 'discover' ? '지금 듣기 좋은 방송' : view === 'favorites' ? '즐겨찾기' : '최근 들은 방송'}</span>
                  <h2>{displayedStations.length}개 방송</h2>
                </div>
                <div className="result-heading-actions">
                  {loading ? <Loader2 className="spin" aria-label="방송국을 찾고 있어요." size={20} /> : null}
                  {view === 'recent' && displayedStations.length > 0 ? (
                    <button className="result-text-action danger" type="button" onClick={clearRecent}>
                      전체 삭제
                    </button>
                  ) : null}
                  {view === 'favorites' && displayedStations.length > 0 ? (
                    <button className="result-text-action danger" type="button" onClick={clearFavorites}>
                      전체 삭제
                    </button>
                  ) : null}
                </div>
              </div>
              {renderStationList()}
            </section>

            <section className="player-column">
              <DirectAudioPlayer
                station={activeStation ?? selectedStation}
                status={playbackStatus}
                error={playbackError}
                onPlay={() => void playDirect(activeStation ?? selectedStation)}
                onPause={pauseDirect}
                onRetry={() => void playDirect(activeStation ?? selectedStation)}
                onUseYouTube={() => sheetStation && chooseYouTube(sheetStation)}
                showYouTubeFallback={Boolean(settings.showYouTubeAlternates && playerYouTubeAlternate)}
                nativePlayback={nativePlaybackEnabled}
              />
              <StationDetail
                station={selectedStation}
                showYouTubeAlternate={settings.showYouTubeAlternates}
                youtubeMounted={hasMountedYouTube}
                onMountYouTube={() => selectedStation && chooseYouTube(selectedStation)}
              />
            </section>
          </div>
        )}
      </main>

      <audio ref={audioRef} className="persistent-audio" preload="none" />

      <nav className="radio-bottom-nav" aria-label="지구라디오 화면">
        <button className={view === 'discover' ? 'is-active' : ''} type="button" onClick={() => setView('discover')}>
          <Search aria-hidden="true" size={19} />
          <span>홈</span>
        </button>
        <button className={view === 'favorites' ? 'is-active' : ''} type="button" onClick={() => setView('favorites')}>
          <Heart aria-hidden="true" size={19} />
          <span>저장</span>
        </button>
        <button className={view === 'recent' ? 'is-active' : ''} type="button" onClick={() => setView('recent')}>
          <Clock3 aria-hidden="true" size={19} />
          <span>최근</span>
        </button>
        <button className={view === 'settings' ? 'is-active' : ''} type="button" onClick={() => setView('settings')}>
          <Settings aria-hidden="true" size={19} />
          <span>설정</span>
        </button>
      </nav>

      {activeSourceType === 'radio' ? (
        <MiniPlayer
          station={activeStation}
          sourceType={activeSourceType}
          status={playbackStatus}
          isFavorite={Boolean(activeStation && favoriteIds.has(activeStation.stationuuid))}
          onPlay={() => void playDirect(activeStation)}
          onPause={pauseDirect}
          onToggleFavorite={() => activeStation && toggleFavorite(activeStation)}
          onOpenDetails={() => {
            setSheetDragOffset(0);
            setPlayerSheetOpen(true);
          }}
        />
      ) : null}

      {playerSheetOpen && activeSourceType === 'radio' ? (
        <div className="player-sheet-backdrop" role="presentation" onClick={closePlayerSheet}>
          <section
            className={`player-bottom-sheet ${sheetDragOffset > 0 ? 'is-dragging' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="현재 재생 중인 방송"
            onClick={(event) => event.stopPropagation()}
            style={{ transform: sheetDragOffset > 0 ? `translateY(${sheetDragOffset}px)` : undefined }}
          >
            <div
              className="sheet-drag-zone"
              role="presentation"
              onPointerDown={startSheetDrag}
              onPointerMove={moveSheetDrag}
              onPointerUp={endSheetDrag}
              onPointerCancel={endSheetDrag}
            >
              <div className="sheet-grabber" aria-hidden="true" />
            </div>
            <div
              className="sheet-header"
              onPointerDown={startSheetDrag}
              onPointerMove={moveSheetDrag}
              onPointerUp={endSheetDrag}
              onPointerCancel={endSheetDrag}
            >
              <div>
                <span>현재 방송</span>
                <strong>{activeStation?.name ?? selectedStation?.name ?? '방송을 선택해 주세요'}</strong>
              </div>
              <button
                className="sheet-close-button"
                type="button"
                onClick={closePlayerSheet}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label="현재 방송 패널 닫기"
              >
                <X aria-hidden="true" size={20} strokeWidth={2.4} />
              </button>
            </div>
            <div className="sheet-body">
              <DirectAudioPlayer
                station={sheetStation}
                status={playbackStatus}
                error={playbackError}
                onPlay={() => void playDirect(sheetStation)}
                onPause={pauseDirect}
                onRetry={() => void playDirect(sheetStation)}
                onUseYouTube={() => sheetStation && chooseYouTube(sheetStation)}
                showYouTubeFallback={Boolean(settings.showYouTubeAlternates && playerYouTubeAlternate)}
                nativePlayback={nativePlaybackEnabled}
              />
              <StationDetail
                station={sheetStation}
                showYouTubeAlternate={settings.showYouTubeAlternates}
                youtubeMounted={sheetHasMountedYouTube}
                onMountYouTube={() => sheetStation && chooseYouTube(sheetStation)}
              />
            </div>
          </section>
        </div>
      ) : null}

      {toast ? <Toast toast={toast} /> : null}
      {permissionPrompt ? <PermissionPrompt kind={permissionPrompt} onConfirm={confirmPermissionPrompt} onCancel={cancelPermissionPrompt} /> : null}
      <AppSplash visible={showSplash} />
    </div>
  );
}
