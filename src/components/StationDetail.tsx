import { ExternalLink, RadioTower, ShieldCheck } from 'lucide-react';
import { getYouTubeAlternate } from '../data/youtubeAlternates.seed';
import { getPreferredSource } from '../lib/playbackSource';
import { scoreStationQuality } from '../lib/qualityScore';
import type { RadioStation } from '../types/station';
import { QualityBadge } from './QualityBadge';
import { YouTubeAlternatePlayer } from './YouTubeAlternatePlayer';

export function StationDetail({
  station,
  showYouTubeAlternate,
  youtubeMounted,
  onMountYouTube
}: {
  station: RadioStation | null;
  showYouTubeAlternate: boolean;
  youtubeMounted: boolean;
  onMountYouTube: () => void;
}) {
  if (!station) {
    return (
      <aside className="station-detail empty-detail">
        <RadioTower aria-hidden="true" size={24} />
        <strong>방송국을 선택해 주세요.</strong>
        <p>품질 점수, 재생 경로, 대체 소스 정보를 여기에서 확인할 수 있습니다.</p>
      </aside>
    );
  }

  const quality = scoreStationQuality(station);
  const alternate = getYouTubeAlternate(station.stationuuid);
  const recommendation = getPreferredSource(station, alternate);

  return (
    <aside className="station-detail">
      <div className="detail-title-row">
        <div>
          <span>선택한 방송국</span>
          <h2>{station.name}</h2>
          <p>{[station.country, station.language].filter(Boolean).join(' / ') || '지역 정보 확인 필요'}</p>
        </div>
        <QualityBadge quality={quality} />
      </div>

      <section className="quality-breakdown">
        <h3>품질 계산 근거</h3>
        <ul>
          {quality.reasons.map((reason) => (
            <li key={reason}>
              <ShieldCheck aria-hidden="true" size={15} />
              {reason}
            </li>
          ))}
        </ul>
      </section>

      <section className="source-summary">
        <h3>재생 경로</h3>
        <p>{recommendation.reason}</p>
        <dl>
          <div>
            <dt>Direct stream</dt>
            <dd>{station.url_resolved || station.url}</dd>
          </div>
          <div>
            <dt>HTTPS</dt>
            <dd>{quality.isHttps ? '예' : '아니요'}</dd>
          </div>
          <div>
            <dt>검증된 YouTube 대체 소스</dt>
            <dd>{alternate ? alternate.label : '없음'}</dd>
          </div>
        </dl>
      </section>

      {station.homepage ? (
        <a className="source-link" href={station.homepage} target="_blank" rel="noreferrer">
          방송국 홈페이지 열기
          <ExternalLink aria-hidden="true" size={14} />
        </a>
      ) : null}

      {showYouTubeAlternate && alternate ? (
        <YouTubeAlternatePlayer station={station} source={alternate} mounted={youtubeMounted} onMount={onMountYouTube} />
      ) : null}
    </aside>
  );
}
