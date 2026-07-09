import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSearchUrl, getFallbackFilterOptions, getFallbackStations, loadRadioBrowserFilterOptions } from '../lib/radioBrowser';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Radio Browser global metadata options', () => {
  it('keeps broad fallback country and language options when metadata is unavailable', () => {
    const options = getFallbackFilterOptions();

    expect(options.countries.map((option) => option.value)).toEqual(expect.arrayContaining(['', 'KR', 'JP', 'US', 'GB', 'DE', 'FR', 'BR', 'IN']));
    expect(options.languages.map((option) => option.value)).toEqual(expect.arrayContaining(['', 'korean', 'english', 'japanese', 'spanish', 'german']));
    expect(options.tags.map((option) => option.value)).toEqual(expect.arrayContaining(['', 'jazz', 'news', 'pop', 'rock', 'talk']));
  });

  it('uses Radio Browser countrycode search for ISO country filters', () => {
    const url = new URL(
      buildSearchUrl('https://de1.api.radio-browser.info', {
        country: 'JP',
        language: 'japanese',
        tag: 'jazz',
        limit: 160
      })
    );

    expect(url.searchParams.get('countrycode')).toBe('JP');
    expect(url.searchParams.has('country')).toBe(false);
    expect(url.searchParams.get('hidebroken')).toBe('true');
    expect(url.searchParams.get('language')).toBe('japanese');
    expect(url.searchParams.get('tag')).toBe('jazz');
    expect(url.searchParams.get('limit')).toBe('160');
  });

  it('keeps metadata counts out of visible filter labels', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      const payload = url.includes('/countries')
        ? [{ name: 'Germany', iso_3166_1: 'DE', stationcount: 5990 }]
        : url.includes('/languages')
          ? [{ name: 'english', stationcount: 12249 }]
          : [{ name: 'jazz', stationcount: 1156 }];

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(payload)
      } as Response);
    });

    const options = await loadRadioBrowserFilterOptions();

    expect(options.countries[1]).toMatchObject({ label: 'Germany (DE)', value: 'DE', stationcount: 5990 });
    expect(options.languages[1]).toMatchObject({ label: 'English', value: 'english', stationcount: 12249 });
    expect(options.tags[1]).toMatchObject({ label: 'Jazz', value: 'jazz', stationcount: 1156 });
    expect([...options.countries, ...options.languages, ...options.tags].map((option) => option.label).join(' ')).not.toContain('·');
  });

  it('keeps legacy country-name fallback matching while supporting country codes', () => {
    const byCountryName = getFallbackStations({ country: 'Japan', tag: 'japan-priority' }).map((station) => station.stationuuid);
    const byCountryCode = getFallbackStations({ country: 'JP', tag: 'japan-priority' }).map((station) => station.stationuuid);

    expect(byCountryCode).toEqual(byCountryName);
    expect(byCountryCode.length).toBeGreaterThan(0);
  });
});
