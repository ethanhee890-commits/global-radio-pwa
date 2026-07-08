import { describe, expect, it } from 'vitest';
import { scoreStationQuality } from '../lib/qualityScore';

describe('scoreStationQuality', () => {
  it('grades high bitrate AAC HTTPS streams as excellent', () => {
    const quality = scoreStationQuality({
      codec: 'AAC',
      bitrate: 128,
      hls: 1,
      lastcheckok: 1,
      ssl_error: 0,
      url_resolved: 'https://example.com/live.aac'
    });

    expect(quality.grade).toBe('excellent');
    expect(quality.score).toBeGreaterThanOrEqual(80);
  });

  it('marks failed recent checks as failed regardless of bitrate', () => {
    const quality = scoreStationQuality({
      codec: 'MP3',
      bitrate: 320,
      hls: 0,
      lastcheckok: 0,
      ssl_error: 0,
      url_resolved: 'https://example.com/live.mp3'
    });

    expect(quality.grade).toBe('failed');
    expect(quality.isLikelyPlayable).toBe(false);
  });

  it('keeps missing codec and bitrate in the unknown range', () => {
    const quality = scoreStationQuality({
      hls: 0,
      lastcheckok: 1,
      ssl_error: 0,
      url_resolved: 'https://example.com/live'
    });

    expect(['unknown', 'fair']).toContain(quality.grade);
    expect(quality.reasons.join(' ')).toContain('비트레이트 확인 필요');
  });
});
