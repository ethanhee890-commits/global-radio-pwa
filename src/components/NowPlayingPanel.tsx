import { ExternalLink, Info, Music2, RefreshCw, RadioTower } from 'lucide-react';
import type { NowPlayingInfo, RadioStation } from '../types/station';

function formatCheckedAt(value?: string): string {
  if (!value) {
    return '아직 확인 전';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value));
}

export function NowPlayingPanel({
  station,
  nowPlaying,
  onRefresh
}: {
  station: RadioStation | null;
  nowPlaying: NowPlayingInfo;
  onRefresh: () => void;
}) {
  return (
    <section className="now-playing-panel" aria-label="현재 재생 정보">
      <div className="section-heading">
        <div>
          <span>현재 방송</span>
          <h2>흐르는 정보</h2>
        </div>
        <Music2 aria-hidden="true" size={22} />
      </div>

      <div className={`now-playing-status status-${nowPlaying.status}`}>
        <Info aria-hidden="true" size={16} />
        <span>{nowPlaying.message}</span>
      </div>

      <div className="now-playing-body">
        {nowPlaying.artworkUrl ? <img src={nowPlaying.artworkUrl} alt="" /> : <RadioTower aria-hidden="true" size={34} />}
        <div>
          <span>{station ? station.name : '방송국 미선택'}</span>
          <strong>{nowPlaying.trackTitle || '곡명 정보 없음'}</strong>
          <small>{nowPlaying.artist || '아티스트 정보 없음'}</small>
        </div>
      </div>

      <dl className="now-playing-meta">
        <div>
          <dt>프로그램</dt>
          <dd>{nowPlaying.programTitle || '제공 안 됨'}</dd>
        </div>
        <div>
          <dt>앨범</dt>
          <dd>{nowPlaying.album || '제공 안 됨'}</dd>
        </div>
        <div>
          <dt>제공처</dt>
          <dd>{nowPlaying.provider || '방송국별 API 미연결'}</dd>
        </div>
        <div>
          <dt>확인 시각</dt>
          <dd>{formatCheckedAt(nowPlaying.checkedAt)}</dd>
        </div>
      </dl>

      <div className="now-playing-actions">
        <button className="radio-button secondary" type="button" onClick={onRefresh} disabled={!station || nowPlaying.status === 'checking'}>
          <RefreshCw aria-hidden="true" size={16} />
          새로고침
        </button>
        {nowPlaying.sourceUrl ? (
          <a className="source-link" href={nowPlaying.sourceUrl} target="_blank" rel="noreferrer">
            출처 열기
            <ExternalLink aria-hidden="true" size={14} />
          </a>
        ) : null}
      </div>
    </section>
  );
}
