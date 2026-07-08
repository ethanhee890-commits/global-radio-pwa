import type { StationQuality } from '../types/station';

export function QualityBadge({ quality }: { quality: StationQuality }) {
  return (
    <span className={`quality-badge quality-${quality.grade}`} title={quality.reasons.join(' / ')}>
      <span aria-hidden="true" />
      {quality.label}
      <strong>{quality.score}</strong>
    </span>
  );
}
