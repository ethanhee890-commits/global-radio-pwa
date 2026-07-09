import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DirectAudioPlayer } from '../components/DirectAudioPlayer';
import { YouTubeAlternatePlayer } from '../components/YouTubeAlternatePlayer';
import type { RadioStation, YouTubeAlternateSource } from '../types/station';

const station: RadioStation = {
  stationuuid: 'alias-mbc-fm4u',
  name: 'MBC FM4U',
  url: 'https://minimw.imbc.com/dmfm/_definst_/mfm.stream/playlist.m3u8',
  url_resolved: 'https://minimw.imbc.com/dmfm/_definst_/mfm.stream/playlist.m3u8',
  country: 'The Republic Of Korea',
  countrycode: 'KR',
  language: 'korean',
  codec: 'AAC+',
  bitrate: 107,
  hls: 1,
  lastcheckok: 1,
  ssl_error: 0
};

const alternate: YouTubeAlternateSource = {
  id: 'yt-mbc-radio-official',
  stationuuid: 'alias-mbc-fm4u',
  type: 'youtube_channel',
  youtubeChannelId: 'UCKNZsAeQXpvI-Mpoc0ZKhsA',
  label: 'MBC Radio official YouTube',
  verificationStatus: 'verified',
  verificationMethod: 'manual_seed',
  sourceUrl: 'https://www.youtube.com/@radiombc'
};

describe('YouTube fallback UI boundaries', () => {
  it('shows the verified YouTube handoff only after direct radio playback fails', () => {
    const markup = renderToStaticMarkup(
      <DirectAudioPlayer
        station={station}
        status="error"
        error="Direct stream failed"
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onRetry={vi.fn()}
        onUseYouTube={vi.fn()}
        showYouTubeFallback
      />
    );

    expect(markup).toContain('radio-button primary');
    expect(markup).toContain('radio-button youtube');
    expect(markup).toContain('Direct stream failed');
  });

  it('does not show a YouTube handoff when no verified alternate is available', () => {
    const markup = renderToStaticMarkup(
      <DirectAudioPlayer
        station={station}
        status="error"
        error="Direct stream failed"
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onRetry={vi.fn()}
        showYouTubeFallback={false}
      />
    );

    expect(markup).not.toContain('radio-button youtube');
    expect(markup).toContain('radio-button primary');
  });

  it('keeps the official YouTube iframe unmounted until the user chooses it', () => {
    const markup = renderToStaticMarkup(
      <YouTubeAlternatePlayer station={station} source={alternate} mounted={false} onMount={vi.fn()} />
    );

    expect(markup).not.toContain('<iframe');
    expect(markup).toContain('radio-button youtube');
  });

  it('renders a visible official YouTube iframe after the user chooses it', () => {
    const markup = renderToStaticMarkup(
      <YouTubeAlternatePlayer station={station} source={alternate} mounted onMount={vi.fn()} />
    );

    expect(markup).toContain('<iframe');
    expect(markup).toContain('class="youtube-frame"');
    expect(markup).toContain('https://www.youtube.com/embed/live_stream?channel=UCKNZsAeQXpvI-Mpoc0ZKhsA');
    expect(markup).toContain('allow="autoplay; encrypted-media; picture-in-picture"');
    expect(markup).toContain('referrerPolicy="strict-origin-when-cross-origin"');
    expect(markup).not.toContain('display:none');
    expect(markup).not.toContain('visibility:hidden');
  });
});
