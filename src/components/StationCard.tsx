import { ExternalLink, Heart, Play, Radio, Youtube } from 'lucide-react';
import { getYouTubeAlternate } from '../data/youtubeAlternates.seed';
import { scoreStationQuality } from '../lib/qualityScore';
import type { RadioStation } from '../types/station';
import { QualityBadge } from './QualityBadge';

function getStationInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || 'R';
}

function getTagList(tags?: string): string[] {
  return (tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function StationCard({
  station,
  isFavorite,
  showYouTubeAlternate,
  active,
  onPlay,
  onSelect,
  onToggleFavorite,
  onChooseYouTube
}: {
  station: RadioStation;
  isFavorite: boolean;
  showYouTubeAlternate: boolean;
  active: boolean;
  onPlay: (station: RadioStation) => void;
  onSelect: (station: RadioStation) => void;
  onToggleFavorite: (station: RadioStation) => void;
  onChooseYouTube: (station: RadioStation) => void;
}) {
  const quality = scoreStationQuality(station);
  const alternate = getYouTubeAlternate(station.stationuuid);
  const tags = getTagList(station.tags);

  return (
    <article className={`station-card ${active ? 'is-active' : ''}`}>
      <div className="station-card-main">
        <span className="station-avatar" aria-hidden="true">
          {getStationInitial(station.name)}
        </span>
        <div>
          <button className="station-title-button" type="button" onClick={() => onSelect(station)}>
            <strong>{station.name}</strong>
          </button>
          <p>{[station.country, station.language].filter(Boolean).join(' · ') || '출처 정보 확인 필요'}</p>
        </div>
      </div>

      <div className="station-meta-row">
        <QualityBadge quality={quality} />
        <span>
          <Radio aria-hidden="true" size={14} />
          {station.codec || 'codec ?'} · {station.bitrate ? `${station.bitrate}kbps` : 'bitrate ?'} · {station.hls === 1 ? 'HLS' : 'Direct'}
        </span>
      </div>

      {tags.length > 0 ? (
        <div className="station-tag-row" aria-label="방송국 태그">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}

      <div className="station-actions">
        <button className="radio-button primary" type="button" onClick={() => onPlay(station)} aria-label={`${station.name} 재생하기`}>
          <Play aria-hidden="true" size={17} />
          재생하기
        </button>
        <button
          className="radio-button secondary"
          type="button"
          onClick={() => onToggleFavorite(station)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `${station.name} 즐겨찾기 해제` : `${station.name} 즐겨찾기에 추가`}
        >
          <Heart aria-hidden="true" size={17} fill={isFavorite ? 'currentColor' : 'none'} />
          {isFavorite ? '저장됨' : '저장'}
        </button>
      </div>

      {showYouTubeAlternate && alternate && (quality.grade === 'low' || quality.grade === 'failed') ? (
        <button className="youtube-inline-cta" type="button" onClick={() => onChooseYouTube(station)}>
          <Youtube aria-hidden="true" size={17} />
          YouTube 공식 라이브로 듣기
          <ExternalLink aria-hidden="true" size={14} />
        </button>
      ) : null}
    </article>
  );
}
