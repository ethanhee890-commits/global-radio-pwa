import type { QualityGrade, StationQuality, StationQualityInput } from '../types/station';

const QUALITY_LABELS: Record<QualityGrade, string> = {
  excellent: '매우 좋음',
  good: '좋음',
  fair: '보통',
  low: '낮음',
  unknown: '확인 필요',
  failed: '재생 실패'
};

function normalizeCodec(codec?: string): string {
  return (codec ?? '').trim().toLowerCase();
}

function getStreamUrl(station: StationQualityInput): string {
  return station.url_resolved || station.url || '';
}

export function isHttpsStream(station: StationQualityInput): boolean {
  return getStreamUrl(station).toLowerCase().startsWith('https://');
}

export function scoreStationQuality(station: StationQualityInput): StationQuality {
  const reasons: string[] = [];
  const codec = normalizeCodec(station.codec);
  const bitrate = Number(station.bitrate ?? 0);
  const hasBitrate = bitrate > 0;
  const isHttps = isHttpsStream(station);
  const lastcheckok = station.lastcheckok;

  if (lastcheckok === 0) {
    return {
      score: 0,
      grade: 'failed',
      label: QUALITY_LABELS.failed,
      reasons: ['최근 검사에서 재생 실패로 표시되었습니다.'],
      isHttps,
      isLikelyPlayable: false
    };
  }

  let score = lastcheckok === 1 ? 36 : 22;

  if (lastcheckok === 1) {
    reasons.push('최근 검사 통과');
  } else {
    reasons.push('최근 검사 상태 확인 필요');
  }

  if (station.ssl_error === 1) {
    score -= 18;
    reasons.push('SSL 오류 신호 있음');
  }

  if (isHttps) {
    score += 12;
    reasons.push('HTTPS 스트림');
  } else {
    score -= 8;
    reasons.push('HTTP 스트림');
  }

  if (station.hls === 1) {
    score += 8;
    reasons.push('HLS 스트림');
  }

  if (codec.includes('aac') || codec.includes('opus')) {
    if (bitrate >= 128) {
      score += 32;
      reasons.push(`${station.codec} ${bitrate}kbps`);
    } else if (bitrate >= 96) {
      score += 24;
      reasons.push(`${station.codec} ${bitrate}kbps`);
    } else if (hasBitrate) {
      score += 10;
      reasons.push(`${station.codec} 저비트레이트`);
    } else {
      score += 12;
      reasons.push(`${station.codec} 비트레이트 확인 필요`);
    }
  } else if (codec.includes('mp3')) {
    if (bitrate >= 192) {
      score += 28;
      reasons.push(`MP3 ${bitrate}kbps`);
    } else if (bitrate >= 128) {
      score += 20;
      reasons.push(`MP3 ${bitrate}kbps`);
    } else if (hasBitrate) {
      score += 6;
      reasons.push('MP3 저비트레이트');
    } else {
      score += 8;
      reasons.push('MP3 비트레이트 확인 필요');
    }
  } else if (codec) {
    score += hasBitrate && bitrate >= 128 ? 12 : 4;
    reasons.push(`${station.codec} 코덱`);
  } else {
    score -= 2;
    reasons.push('코덱 확인 필요');
  }

  if (!hasBitrate) {
    score -= 4;
    reasons.push('비트레이트 확인 필요');
  }

  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  let grade: QualityGrade = 'unknown';

  if (!codec && !hasBitrate) {
    grade = clampedScore >= 50 ? 'fair' : 'unknown';
  } else if (clampedScore >= 80) {
    grade = 'excellent';
  } else if (clampedScore >= 64) {
    grade = 'good';
  } else if (clampedScore >= 48) {
    grade = 'fair';
  } else if (clampedScore >= 24) {
    grade = 'low';
  }

  return {
    score: clampedScore,
    grade,
    label: QUALITY_LABELS[grade],
    reasons,
    isHttps,
    isLikelyPlayable: clampedScore >= 24 && station.ssl_error !== 1
  };
}

export function compareStationsByQuality(a: StationQualityInput, b: StationQualityInput): number {
  const qualityA = scoreStationQuality(a);
  const qualityB = scoreStationQuality(b);
  if (qualityA.score !== qualityB.score) {
    return qualityB.score - qualityA.score;
  }

  return Number(b.bitrate ?? 0) - Number(a.bitrate ?? 0);
}
