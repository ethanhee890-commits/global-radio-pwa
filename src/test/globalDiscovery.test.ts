import { describe, expect, it } from 'vitest';
import { FALLBACK_STATIONS } from '../data/youtubeAlternates.seed';
import { getFallbackStations } from '../lib/radioBrowser';

describe('global radio discovery catalog', () => {
  it('ships a broad multi-country fallback catalog instead of a tiny demo list', () => {
    const stations = getFallbackStations();
    const productionStations = stations.filter((station) => station.countrycode !== 'TS');
    const countryCodes = new Set(productionStations.map((station) => station.countrycode));
    const japanStations = productionStations.filter((station) => station.countrycode === 'JP');
    const nonJapanStations = productionStations.filter((station) => station.countrycode !== 'JP');

    expect(productionStations.length).toBeGreaterThanOrEqual(40);
    expect(countryCodes.size).toBeGreaterThanOrEqual(10);
    expect(japanStations.length).toBeGreaterThanOrEqual(10);
    expect(nonJapanStations.length).toBeGreaterThanOrEqual(25);
  });

  it('keeps Japan as a priority country without making the whole product Japan-only', () => {
    const japanStations = getFallbackStations({ country: 'JP', language: 'japanese' });
    const globalCountryCodes = new Set(FALLBACK_STATIONS.map((station) => station.countrycode));

    expect(japanStations.length).toBeGreaterThanOrEqual(10);
    expect(japanStations.every((station) => station.countrycode === 'JP')).toBe(true);
    expect(japanStations.some((station) => station.stationuuid === 'seed-jp-nhk-world-radio')).toBe(true);
    expect(globalCountryCodes.has('US')).toBe(true);
    expect(globalCountryCodes.has('GB')).toBe(true);
    expect(globalCountryCodes.has('FR')).toBe(true);
  });
});
