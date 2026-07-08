import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchStations } from '../lib/radioBrowser';

describe('Radio Browser search routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses countrycode for ISO country filters so Japan searches are broad and stable', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await searchStations({ country: 'JP', language: 'japanese', limit: 10 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('countrycode=JP');
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('country=JP');
  });

  it('fans out default discovery across multiple countries with Japan included first', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await searchStations({});

    const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(calledUrls.length).toBeGreaterThanOrEqual(10);
    expect(calledUrls[0]).toContain('countrycode=JP');
    expect(calledUrls.some((url) => url.includes('countrycode=US'))).toBe(true);
    expect(calledUrls.some((url) => url.includes('countrycode=GB'))).toBe(true);
  });

  it('drops insecure Radio Browser favicons before rendering to avoid CSP console errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            stationuuid: 'remote-http-favicon',
            name: 'Remote HTTP Favicon',
            url: 'https://example.com/radio.mp3',
            url_resolved: 'https://example.com/radio.mp3',
            favicon: 'http://example.com/favicon.ico',
            country: 'Japan',
            countrycode: 'JP',
            language: 'japanese',
            codec: 'MP3',
            bitrate: 128,
            hls: 0,
            lastcheckok: 1,
            ssl_error: 0
          }
        ]),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const stations = await searchStations({ country: 'JP', language: 'japanese', limit: 10 });

    expect(stations.find((station) => station.stationuuid === 'remote-http-favicon')?.favicon).toBeUndefined();
  });
});
