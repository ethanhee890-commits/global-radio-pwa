import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, Loader2, Radio, RotateCcw, Settings, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { getYouTubeAlternate } from './data/youtubeAlternates.seed';
import { compareStationsByQuality, scoreStationQuality } from './lib/qualityScore';
import { searchStations } from './lib/radioBrowser';
import {
  loadFavoriteStations,
  loadGlobalRadioSettings,
  loadRecentStations,
  saveFavoriteStations,
  saveGlobalRadioSettings,
  saveRecentStations,
  upsertStoredStation
} from './lib/globalRadioStorage';
import type { GlobalRadioSettings, PlaybackStatus, RadioStation, StoredStation } from './types/station';
import { DirectAudioPlayer } from './components/DirectAudioPlayer';
import { FilterBar, type RadioFilters } from './components/FilterBar';
import { MiniPlayer } from './components/MiniPlayer';
import { SearchBar } from './components/SearchBar';
import { StationCard } from './components/StationCard';
import { StationDetail } from './components/StationDetail';
import { Toast, type ToastState } from './components/Toast';
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
  const playbackTimerRef = useRef<number | null>(null);
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

  const favoriteIds = useMemo(() => new Set(favorites.map((station) => station.stationuuid)), [favorites]);
  const visibleStations = useMemo(() => sortStations(stations, filters.sort, settings), [stations, filters.sort, settings]);
  const favoriteStations = useMemo(() => favorites.map(stationFromStored), [favorites]);
  const recentStations = useMemo(() => recent.map(stationFromStored), [recent]);
  const displayedStations = view === 'favorites' ? favoriteStations : view === 'recent' ? recentStations : visibleStations;
  const hasMountedYouTube = selectedStation?.stationuuid === youtubeMountedStationId;
  const isJapanFocused =
    view === 'discover' &&
    (filters.country === 'Japan' ||
      filters.country === 'JP' ||
      filters.tag.includes('japan') ||
      filters.tag === 'terrestrial-fm' ||
      query.trim().toLowerCase().includes('japan') ||
      query.trim().toLowerCase().includes('nhk') ||
      query.includes('일본') ||
      query.includes('일본') ||
      query.includes('日本'));

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
    void loadStations(DEFAULT_FILTERS, '');
  }, [loadStations]);

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
      setPlaybackError('이 라디오 스트림은 지금 재생할 수 없어요. 다른 소스를 시도해 주세요.');
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

  function showToast(message: string, tone: ToastState['tone'] = 'info') {
    setToast({ tone, message });
  }

  function clearPlaybackTimer() {
    if (playbackTimerRef.current) {
      window.clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }

  async function playDirect(station = selectedStation) {
    if (!station || !audioRef.current) {
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
    const streamUrl = station.url_resolved || station.url;
    audio.src = streamUrl;
    audio.load();

    playbackTimerRef.current = window.setTimeout(() => {
      if (audioRef.current && audioRef.current.readyState < 2 && playbackStatus !== 'playing') {
        audioRef.current.pause();
        setPlaybackStatus('error');
        setPlaybackError('재생 준비 시간이 길어졌어요. 다시 시도하거나 다른 소스를 선택해 주세요.');
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
      setPlaybackStatus(isAutoplayBlock ? 'autoplay_blocked' : 'error');
      setPlaybackError(
        isAutoplayBlock
          ? '브라우저 정책상 재생 버튼을 한 번 더 눌러주세요.'
          : '이 라디오 스트림은 지금 재생할 수 없어요. 다른 소스를 시도해 주세요.'
      );
    }
  }

  function pauseDirect() {
    audioRef.current?.pause();
    setPlaybackStatus('paused');
  }

  function chooseYouTube(station: RadioStation) {
    const alternate = getYouTubeAlternate(station.stationuuid);
    if (!alternate) {
      showToast('아직 검증된 대체 소스가 없어요.', 'error');
      return;
    }

    audioRef.current?.pause();
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

  function clearRecent() {
    setRecent([]);
    saveRecentStations([]);
    showToast('최근 들은 방송을 비웠어요.', 'success');
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
          <button className="radio-button secondary" type="button" onClick={() => void loadStations(filters, query)}>
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
          />
        ))}
      </div>
    );
  }

  return (
    <div className="global-radio-app">
      <header className="global-radio-header">
        <button className="radio-brand" type="button" onClick={() => setView('discover')}>
          <span aria-hidden="true">
            <Headphones size={22} />
          </span>
          <span>
            <strong>지구라디오</strong>
            <small>좋은 음질로 듣는 전세계 라디오</small>
          </span>
        </button>
        <nav className="radio-nav" aria-label="지구라디오 화면">
          <button className={view === 'discover' ? 'is-active' : ''} type="button" onClick={() => setView('discover')}>
            검색
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
        <section className="radio-hero">
          <div>
            <h1>좋은 음질로 듣는 전세계 라디오</h1>
            <p>국가, 언어, 장르별 인터넷 라디오를 품질 좋은 소스부터 찾아드려요.</p>
          </div>
          <div className="hero-quality-note">
            <Sparkles aria-hidden="true" size={20} />
            <strong>품질 기준</strong>
            <span>codec · bitrate · HLS · HTTPS · 최근 검사 · SSL 오류</span>
            <button className="radio-button primary hero-japan-button" type="button" onClick={focusJapanBroadcasts}>
              일본 공중파/공개 FM 바로 듣기
            </button>
          </div>
        </section>

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
                <strong>YouTube 대체 소스 표시</strong>
                <small>검증된 공식 대체 소스가 있을 때만 버튼을 보여줘요.</small>
              </span>
            </label>
            <div className="settings-actions">
              <button className="radio-button secondary" type="button" onClick={clearRecent}>
                <Trash2 aria-hidden="true" size={16} />
                최근 들은 방송 삭제
              </button>
              <button className="radio-button secondary" type="button" onClick={clearFavorites}>
                <Trash2 aria-hidden="true" size={16} />
                즐겨찾기 삭제
              </button>
            </div>
          </section>
        ) : (
          <div className="radio-workspace">
            <section className="radio-list-panel">
              {view === 'discover' ? (
                <>
                  <SearchBar query={query} loading={loading} onQueryChange={setQuery} onSubmit={() => void loadStations(filters, query)} />
                  <FilterBar filters={filters} onChange={updateFilters} />
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
                {loading ? <Loader2 className="spin" aria-label="방송국을 찾고 있어요." size={20} /> : <ShieldCheck aria-hidden="true" size={20} />}
              </div>
              {renderStationList()}
            </section>

            <section className="player-column">
              <DirectAudioPlayer
                audioRef={audioRef}
                station={activeStation ?? selectedStation}
                status={playbackStatus}
                error={playbackError}
                onPlay={() => void playDirect(activeStation ?? selectedStation)}
                onPause={pauseDirect}
                onRetry={() => void playDirect(activeStation ?? selectedStation)}
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

      {activeSourceType === 'radio' ? (
        <MiniPlayer
          station={activeStation}
          sourceType={activeSourceType}
          status={playbackStatus}
          isFavorite={Boolean(activeStation && favoriteIds.has(activeStation.stationuuid))}
          onPlay={() => void playDirect(activeStation)}
          onPause={pauseDirect}
          onToggleFavorite={() => activeStation && toggleFavorite(activeStation)}
        />
      ) : null}

      {toast ? <Toast toast={toast} /> : null}
    </div>
  );
}
