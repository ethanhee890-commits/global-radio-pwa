import { Youtube } from 'lucide-react';
import type { RadioStation, YouTubeAlternateSource } from '../types/station';

function getEmbedUrl(source: YouTubeAlternateSource): string {
  if (source.youtubeVideoId) {
    return `https://www.youtube.com/embed/${encodeURIComponent(source.youtubeVideoId)}?rel=0`;
  }

  if (source.youtubeChannelId) {
    return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(source.youtubeChannelId)}`;
  }

  return '';
}

export function YouTubeAlternatePlayer({
  station,
  source,
  mounted,
  onMount
}: {
  station: RadioStation;
  source: YouTubeAlternateSource;
  mounted: boolean;
  onMount: () => void;
}) {
  const embedUrl = getEmbedUrl(source);

  return (
    <section className="youtube-player-panel" aria-label="YouTube 대체 소스">
      <div className="youtube-source-label">
        <Youtube aria-hidden="true" size={20} />
        <div>
          <strong>YouTube 공식 대체 소스</strong>
          <span>{source.label}</span>
        </div>
      </div>
      <p>YouTube는 보이는 플레이어로만 재생합니다. 오디오 추출이나 백그라운드 재생은 사용하지 않습니다.</p>
      {!mounted ? (
        <button className="radio-button youtube" type="button" onClick={onMount}>
          <Youtube aria-hidden="true" size={17} />
          YouTube 공식 라이브로 듣기
        </button>
      ) : null}
      {mounted && embedUrl ? (
        <iframe
          className="youtube-frame"
          src={embedUrl}
          title={`${station.name} YouTube 대체 플레이어`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : null}
      <a className="source-link" href={source.sourceUrl} target="_blank" rel="noreferrer">
        검증 출처 열기
      </a>
    </section>
  );
}
