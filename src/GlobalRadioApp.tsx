import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, Gauge, Globe2, Headphones, Loader2, Music2, Radio, RotateCcw, Settings, ShieldCheck, Trash2 } from 'lucide-react';
import { AlarmPanel } from './components/AlarmPanel';
import { DirectAudioPlayer } from './components/DirectAudioPlayer';
import { FilterBar, type RadioFilters } from './components/FilterBar';
import { MiniPlayer } from './components/MiniPlayer';
import { NowPlayingPanel } from './components/NowPlayingPanel';
import { SearchBar } from './components/SearchBar';
import { StationCard } from './components/StationCard';
import { StationDetail } from './components/StationDetail';
import { Toast, type ToastState } from './components/Toast';
import { getYouTubeAlternate } from './data/youtubeAlternates.seed';
import {
  loadFavoriteStations,
  loadGlobalRadioSettings,
  loadRadioAlarmSettings,
  loadRecentStations,
  saveFavoriteStations,
  saveGlobalRadioSettings,
  saveRadioAlarmSettings,
  saveRecentStations,
  toStoredStation,
  upsertStoredStation
} from './lib/globalRadioStorage';
import { fetchNowPlayingInfo, getMediaSessionMetadata, getStationOnlyNowPlaying } from './lib/nowPlaying';
import { compareStationsByQuality, scoreStationQuality } from './lib/qualityScore';
import { markAlarmTriggered, shouldTriggerAlarm } from './lib/radioAlarm';
import { searchStations } from './lib/radioBrowser';
import type { GlobalRadioSettings, NowPlayingInfo, PlaybackStatus, RadioAlarmSettings, RadioStation, StoredStation } from './types/station';
import './global-radio.css';

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
  tag: '',
  sort: 'quality'
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

export default function GlobalRadioApp() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerColumnRef = useRef<HTMLElement>(null);
  const playbackTimerRef = useRef<number | null>(null);
  const alarmRef = useRef<RadioAlarmSettings>(loadRadioAlarmSettings());
  const playDirectRef = useRef<(station?: RadioStation | null) => Promise<void>>(async () => undefined);
  const showToastRef = useRef<(message: string, tone?: ToastState['tone']) => void>(() => undefined);

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
  const [alarm, setAlarm] = useState<RadioAlarmSettings>(() => alarmRef.current);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingInfo>(() => getStationOnlyNowPlaying(null));
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  const favoriteIds = useMemo(() => new Set(favorites.map((station) => station.stationuuid)), [favorites]);
  const visibleStations = useMemo(() => sortStations(stations, filters.sort, settings), [stations, filters.sort, settings]);
  const favoriteStations = useMemo(() => favorites.map(stationFromStored), [favorites]);
  const recentStations = useMemo(() => recent.map(stationFromStored), [recent]);
  const displayedStations = view === 'favorites' ? favoriteStations : view === 'recent' ? recentStations : visibleStations;
  const currentPlaybackStation = activeStation ?? selectedStation;
  const currentQuality = currentPlaybackStation ? scoreStationQuality(currentPlaybackStation) : null;
  const countryCount = useMemo(() => new Set(displayedStations.map((station) => station.countrycode || station.country).filter(Boolean)).size, [displayedStations]);
  const hasMountedYouTube = selectedStation?.stationuuid === youtubeMountedStationId;
  const hasPlayerContext = Boolean(currentPlaybackStation);
  const alarmSummary = alarm.enabled && alarm.station ? `${alarm.time} · ${alarm.station.name}` : '알람 꺼짐';
  const nowPlayingSummary = nowPlaying.trackTitle ? `${nowPlaying.artist ? `${nowPlaying.artist} - ` : ''}${nowPlaying.trackTitle}` : nowPlaying.status === 'available' ? '현재곡 확인됨' : '현재곡 대기';
  const isJapanFocused =
    view === 'discover' &&
    (filters.country === 'Japan' ||
      filters.country === 'JP' ||
      filters.tag.includes('japan') ||
      filters.tag === 'terrestrial-fm' ||
      query.trim().toLowerCase().includes('japan') ||
      query.trim().toLowerCase().includes('nhk') ||
      query.includes('일본'));

  const showToast = useCallback((message: string, tone: ToastState['tone'] = 'info') => {
    setToast({ tone, message });
  }, []);

  const bringPlayerIntoView = useCallback(() => {
    window.setTimeout(() => {
      if (window.matchMedia('(max-width: 1040px)').matches) {
        playerColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  }, []);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  const persistAlarm = useCallback((nextAlarm: RadioAlarmSettings) => {
    alarmRef.current = nextAlarm;
    setAlarm(nextAlarm);
    saveRadioAlarmSettings(nextAlarm);
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
          limit: nextFilters.country === 'JP' ? 120 : 100
        });
        const sorted = sortStations(results, nextFilters.sort, nextSettings);
        setStations(sorted);
        setSelectedStation((current) => {
          if (current && sorted.some((station) => station.stationuuid === current.stationuuid)) {
            return current;
          }

          return null;
        });
      } catch {
        setListError('방송국 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        setLoading(false);
      }
    },
    [settings]
  );

  const refreshNowPlaying = useCallback(
    async (station = currentPlaybackStation) => {
      if (!station) {
        setNowPlaying(getStationOnlyNowPlaying(null));
        return;
      }

      setNowPlaying({
        status: 'checking',
        stationName: station.name,
        message: '현재 재생 정보를 확인하고 있습니다.'
      });
      const info = await fetchNowPlayingInfo(station);
      setNowPlaying(info);
    },
    [currentPlaybackStation]
  );

  const clearPlaybackTimer = useCallback(() => {
    if (playbackTimerRef.current) {
      window.clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }, []);

  const playDirect = useCallback(
    async (station = selectedStation) => {
      if (!station || !audioRef.current) {
        return;
      }

      clearPlaybackTimer();
      setSelectedStation(station);
      setActiveStation(station);
      bringPlayerIntoView();
      setActiveSourceType('radio');
      setPlaybackStatus('loading');
      setPlaybackError('');
      setYoutubeMountedStationId('');
      void refreshNowPlaying(station);

      const audio = audioRef.current;
      const streamUrl = station.url_resolved || station.url;
      audio.src = streamUrl;
      audio.load();

      playbackTimerRef.current = window.setTimeout(() => {
        if (audioRef.current && audioRef.current.readyState < 2) {
          audioRef.current.pause();
          setPlaybackStatus('error');
          setPlaybackError('재생 준비 시간이 길어졌습니다. 다시 시도하거나 다른 방송을 선택해 주세요.');
        }
      }, 12_000);

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
        setPlaybackStatus(isAutoplayBlock ? 'autoplay_blocked' : 'error');
        setPlaybackError(
          isAutoplayBlock
            ? '브라우저 정책상 자동 재생이 막혔습니다. 재생 버튼을 한 번 더 눌러 주세요.'
            : '이 라디오 스트림은 지금 재생할 수 없습니다. 다른 소스를 시도해 주세요.'
        );
      }
    },
    [bringPlayerIntoView, clearPlaybackTimer, recent, refreshNowPlaying, selectedStation]
  );

  useEffect(() => {
    playDirectRef.current = playDirect;
  }, [playDirect]);

  useEffect(() => {
    void loadStations(DEFAULT_FILTERS, '');
  }, [loadStations]);

  useEffect(() => {
    alarmRef.current = alarm;
  }, [alarm]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentAlarm = alarmRef.current;
      if (!shouldTriggerAlarm(currentAlarm)) {
        return;
      }

      const nextAlarm = markAlarmTriggered(currentAlarm);
      alarmRef.current = nextAlarm;
      setAlarm(nextAlarm);
      saveRadioAlarmSettings(nextAlarm);

      if (currentAlarm.station) {
        const station = stationFromStored(currentAlarm.station);
        showToastRef.current(`${station.name} 알람 시간입니다. 재생을 시도합니다.`, 'success');
        void playDirectRef.current(station);
      }
    }, 15_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

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
      setPlaybackStatus('error');
      setPlaybackError('이 라디오 스트림은 지금 재생할 수 없습니다. 다른 소스를 시도해 주세요.');
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
    if (!activeStation || playbackStatus !== 'playing') {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshNowPlaying(activeStation);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [activeStation, playbackStatus, refreshNowPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !('MediaMetadata' in window)) {
      return;
    }

    const metadata = getMediaSessionMetadata(currentPlaybackStation, nowPlaying);
    if (metadata) {
      navigator.mediaSession.metadata = new window.MediaMetadata(metadata);
    }

    navigator.mediaSession.playbackState = playbackStatus === 'playing' ? 'playing' : playbackStatus === 'paused' ? 'paused' : 'none';
    navigator.mediaSession.setActionHandler('play', () => {
      void playDirectRef.current(currentPlaybackStation);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
      setPlaybackStatus('paused');
    });
  }, [currentPlaybackStation, nowPlaying, playbackStatus]);

  function updateFilters(nextFilters: RadioFilters) {
    setFilters(nextFilters);
    void loadStations(nextFilters, query);
  }

  function focusJapanBroadcasts() {
    setView('discover');
    setQuery('');
    setFilters(JAPAN_PRIORITY_FILTERS);
    void loadStations(JAPAN_PRIORITY_FILTERS, '');
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

  function focusNowPlayingSupported() {
    const nextFilters = {
      ...DEFAULT_FILTERS,
      country: 'US'
    };

    setView('discover');
    setQuery('KEXP');
    setFilters(nextFilters);
    void loadStations(nextFilters, 'KEXP');
  }

  function pauseDirect() {
    audioRef.current?.pause();
    setPlaybackStatus('paused');
  }

  function chooseYouTube(station: RadioStation) {
    const alternate = getYouTubeAlternate(station.stationuuid);
    if (!alternate) {
      showToast('아직 검증된 대체 소스가 없습니다.', 'error');
      return;
    }

    audioRef.current?.pause();
    setSelectedStation(station);
    setActiveStation(station);
    bringPlayerIntoView();
    setActiveSourceType('youtube');
    setPlaybackStatus('paused');
    setYoutubeMountedStationId(station.stationuuid);
    showToast('YouTube 플레이어를 표시했습니다. 플레이어 안에서 재생을 눌러 주세요.', 'success');
  }

  function toggleFavorite(station: RadioStation) {
    const exists = favoriteIds.has(station.stationuuid);
    const next = exists ? favorites.filter((item) => item.stationuuid !== station.stationuuid) : upsertStoredStation(favorites, station);
    setFavorites(next);
    saveFavoriteStations(next);
    showToast(exists ? '즐겨찾기에서 해제했습니다.' : '즐겨찾기에 추가했습니다.', 'success');
  }

  function updateSettings(nextSettings: GlobalRadioSettings) {
    setSettings(nextSettings);
    saveGlobalRadioSettings(nextSettings);
    showToast('설정을 저장했습니다.', 'success');
  }

  function updateAlarm(nextAlarm: RadioAlarmSettings) {
    persistAlarm(nextAlarm);
    showToast('알람 설정을 저장했습니다.', 'success');
  }

  function useSelectedStationForAlarm() {
    const station = selectedStation ?? activeStation;
    if (!station) {
      showToast('먼저 알람에 사용할 방송국을 선택해 주세요.', 'error');
      return;
    }

    const nextAlarm = {
      ...alarm,
      enabled: true,
      station: toStoredStation(station)
    };
    persistAlarm(nextAlarm);
    showToast(`${station.name}을 알람 채널로 설정했습니다.`, 'success');
  }

  function testAlarm() {
    if (!alarm.station) {
      showToast('알람 채널을 먼저 지정해 주세요.', 'error');
      return;
    }

    void playDirect(stationFromStored(alarm.station));
  }

  function clearRecent() {
    setRecent([]);
    saveRecentStations([]);
    showToast('최근 들은 방송을 비웠습니다.', 'success');
  }

  function clearFavorites() {
    setFavorites([]);
    saveFavoriteStations([]);
    showToast('즐겨찾기를 비웠습니다.', 'success');
  }

  function renderStationList() {
    if (loading) {
      return (
        <div className="station-list" aria-label="방송국을 불러오는 중">
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
          <button className="radio-button secondary" type="button" onClick={() => void loadStations(filters, query)}>
            다시 시도
          </button>
        </div>
      );
    }

    if (displayedStations.length === 0) {
      const message =
        view === 'favorites'
          ? '저장한 방송이 아직 없습니다. 마음에 드는 방송을 저장해 보세요.'
          : view === 'recent'
            ? '최근 들은 방송이 없습니다. 먼저 방송을 재생해 보세요.'
            : '조건에 맞는 방송이 없습니다. 국가나 장르를 넓혀 보세요.';

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
            onSelect={(nextStation) => {
              setSelectedStation(nextStation);
              bringPlayerIntoView();
              if (!activeStation) {
                setNowPlaying(getStationOnlyNowPlaying(nextStation));
              }
            }}
            onToggleFavorite={toggleFavorite}
            onChooseYouTube={chooseYouTube}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="global-radio-app">
      <a className="skip-link" href="#radio-main">
        본문으로 건너뛰기
      </a>

      <header className="global-radio-header">
        <button className="radio-brand" type="button" onClick={() => setView('discover')} aria-label="지구라디오 홈">
          <span aria-hidden="true">
            <Headphones size={22} />
          </span>
          <span>
            <strong>지구라디오</strong>
            <small>전세계 방송을 듣는 작은 콘솔</small>
          </span>
        </button>
        <nav className="radio-nav" aria-label="주요 화면">
          <button className={view === 'discover' ? 'is-active' : ''} type="button" onClick={() => setView('discover')}>
            찾기
          </button>
          <button className={view === 'favorites' ? 'is-active' : ''} type="button" onClick={() => setView('favorites')}>
            저장
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

      <main id="radio-main" className="global-radio-main">
        <section className="radio-hero" aria-labelledby="radio-title">
          <div className="hero-copy">
            <span className="hero-kicker">오늘의 라디오</span>
            <h1 id="radio-title">지금 들을 방송을 고르세요</h1>
            <p>국가와 장르를 고르면 품질 점수가 높은 공개 라디오부터 정리합니다. 마음에 드는 방송을 찾고 바로 들으세요.</p>
            <div className="hero-actions">
              <button className="radio-button primary" type="button" onClick={focusJapanBroadcasts}>
                일본 방송 바로 보기
              </button>
              <button className="radio-button secondary" type="button" onClick={focusNowPlayingSupported}>
                현재곡 지원 방송 찾기
              </button>
            </div>
          </div>

          <div className="hero-status-strip" aria-label="현재 청취 상태">
            <div className="hero-status-item">
              <span aria-hidden="true">
                <Globe2 aria-hidden="true" size={16} />
              </span>
              <div>
                <strong>{displayedStations.length}개 방송</strong>
                <small>{countryCount || 1}개 지역에서 검색 중</small>
              </div>
            </div>
            <div className="hero-status-item">
              <span aria-hidden="true">
                <Music2 aria-hidden="true" size={16} />
              </span>
              <div>
                <strong>{nowPlayingSummary}</strong>
                <small>{currentPlaybackStation ? currentPlaybackStation.name : '방송을 선택하면 정보가 채워집니다'}</small>
              </div>
            </div>
            <div className="hero-status-item">
              <span aria-hidden="true">
                <Clock3 aria-hidden="true" size={16} />
              </span>
              <div>
                <strong>{alarmSummary}</strong>
                <small>{currentQuality ? `품질 ${currentQuality.label} · ${currentQuality.score}점` : '알람과 품질 상태'}</small>
              </div>
            </div>
          </div>
        </section>

        {view === 'settings' ? (
          <div className="settings-layout">
            <section className="settings-panel">
              <div className="section-heading">
                <div>
                  <span>재생 환경</span>
                  <h2>청취 설정</h2>
                </div>
                <Gauge aria-hidden="true" size={22} />
              </div>
              <label className="setting-row">
                <input
                  type="checkbox"
                  checked={settings.preferHttps}
                  onChange={(event) => updateSettings({ ...settings, preferHttps: event.target.checked })}
                />
                <span>
                  <strong>HTTPS 스트림 우선</strong>
                  <small>보안 연결을 지원하는 라디오를 더 앞에 보여줍니다.</small>
                </span>
              </label>
              <label className="setting-row">
                <input
                  type="checkbox"
                  checked={settings.hideLowQuality}
                  onChange={(event) => updateSettings({ ...settings, hideLowQuality: event.target.checked })}
                />
                <span>
                  <strong>낮은 품질 숨기기</strong>
                  <small>저품질 또는 최근 재생 실패 신호가 있는 방송을 목록에서 숨깁니다.</small>
                </span>
              </label>
              <label className="setting-row">
                <input
                  type="checkbox"
                  checked={settings.showYouTubeAlternates}
                  onChange={(event) => updateSettings({ ...settings, showYouTubeAlternates: event.target.checked })}
                />
                <span>
                  <strong>YouTube 대체 소스 표시</strong>
                  <small>검증된 공식 대체 소스가 있을 때만 버튼을 보여줍니다.</small>
                </span>
              </label>
              <div className="settings-actions">
                <button className="radio-button secondary" type="button" onClick={clearRecent}>
                  <Trash2 aria-hidden="true" size={16} />
                  최근 기록 비우기
                </button>
                <button className="radio-button secondary" type="button" onClick={clearFavorites}>
                  <Trash2 aria-hidden="true" size={16} />
                  저장 목록 비우기
                </button>
              </div>
            </section>

            <AlarmPanel alarm={alarm} selectedStation={selectedStation} onChange={updateAlarm} onUseSelectedStation={useSelectedStationForAlarm} onTestAlarm={testAlarm} />
          </div>
        ) : (
          <div className={`radio-workspace${hasPlayerContext ? ' has-player-context' : ''}`}>
            <section className="radio-list-panel" aria-label="방송국 목록">
              {view === 'discover' ? (
                <>
                  <SearchBar query={query} loading={loading} onQueryChange={setQuery} onSubmit={() => void loadStations(filters, query)} />
                  <FilterBar filters={filters} onChange={updateFilters} />
                  {isJapanFocused ? (
                    <section className="japan-assurance-panel" aria-label="일본 방송 검증 기준">
                      <div>
                        <strong>일본 방송 우선 검증</strong>
                        <p>
                          NHK WORLD-JAPAN은 공식 HTTPS HLS를 우선하고, Shonan Beach FM과 FM Kahoku는 공식 홈페이지와 스트림 응답을 확인한 공개 FM 후보로 보여줍니다.
                          radiko 전용 주요 민방은 권역 제한 우회 없이 제외합니다.
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
                  <span>{view === 'discover' ? '추천 후보' : view === 'favorites' ? '저장한 방송' : '최근 들은 방송'}</span>
                  <h2>{displayedStations.length}개 방송</h2>
                </div>
                {loading ? <Loader2 className="spin" aria-label="방송국을 찾고 있습니다" size={20} /> : <ShieldCheck aria-hidden="true" size={20} />}
              </div>
              {renderStationList()}
            </section>

            <section className="player-column" ref={playerColumnRef} aria-label="재생 정보" tabIndex={-1}>
              <DirectAudioPlayer
                audioRef={audioRef}
                station={currentPlaybackStation}
                status={playbackStatus}
                error={playbackError}
                onPlay={() => void playDirect(currentPlaybackStation)}
                onPause={pauseDirect}
                onRetry={() => void playDirect(currentPlaybackStation)}
              />
              <NowPlayingPanel station={currentPlaybackStation} nowPlaying={nowPlaying} onRefresh={() => void refreshNowPlaying(currentPlaybackStation)} />
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

      {activeSourceType === 'radio' ? (
        <MiniPlayer
          station={activeStation}
          sourceType={activeSourceType}
          status={playbackStatus}
          isFavorite={Boolean(activeStation && favoriteIds.has(activeStation.stationuuid))}
          nowPlaying={nowPlaying}
          onPlay={() => void playDirect(activeStation)}
          onPause={pauseDirect}
          onToggleFavorite={() => activeStation && toggleFavorite(activeStation)}
        />
      ) : null}

      {toast ? <Toast toast={toast} /> : null}
    </div>
  );
}
