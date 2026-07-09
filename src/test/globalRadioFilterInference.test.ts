import { describe, expect, it } from 'vitest';
import { __globalRadioTestHooks } from '../GlobalRadioApp';
import type { RadioBrowserFilterOption } from '../lib/radioBrowser';
import type { RadioFilters } from '../components/FilterBar';

const countries: RadioBrowserFilterOption[] = [
  { label: '전체', value: '' },
  { label: 'Japan (JP) · 203', value: 'JP' },
  { label: 'The Republic Of Korea (KR) · 80', value: 'KR' },
  { label: 'North Korea (KP) · 1', value: 'KP' },
  { label: 'Spain (ES) · 1,333', value: 'ES' }
];

describe('global radio search and filter relationship', () => {
  it('infers common country queries from user search text', () => {
    expect(__globalRadioTestHooks.inferCountryFromQuery('japan', countries)).toBe('JP');
    expect(__globalRadioTestHooks.inferCountryFromQuery('korea', countries)).toBe('KR');
    expect(__globalRadioTestHooks.inferCountryFromQuery('south korea radio', countries)).toBe('KR');
    expect(__globalRadioTestHooks.inferCountryFromQuery('north korea radio', countries)).toBe('KP');
    expect(__globalRadioTestHooks.inferCountryFromQuery('spain', countries)).toBe('ES');
  });

  it('clears conflicting filters when the search query names another country', () => {
    const filters: RadioFilters = {
      country: 'ES',
      language: 'spanish',
      tag: 'festival',
      sort: 'popular'
    };

    expect(__globalRadioTestHooks.alignFiltersWithQuery(filters, 'japan', countries)).toEqual({
      country: 'JP',
      language: '',
      tag: '',
      sort: 'popular'
    });
  });

  it('keeps filters unchanged when search text does not imply a country', () => {
    const filters: RadioFilters = {
      country: 'ES',
      language: '',
      tag: '',
      sort: 'quality'
    };

    expect(__globalRadioTestHooks.alignFiltersWithQuery(filters, 'jazz festival', countries)).toBe(filters);
  });

  it('uses country-only search text as a filter cue instead of narrowing station names', () => {
    expect(__globalRadioTestHooks.getStationSearchQuery('korea', countries)).toBe('');
    expect(__globalRadioTestHooks.getStationSearchQuery('japan radio', countries)).toBe('');
    expect(__globalRadioTestHooks.getStationSearchQuery('jazz festival', countries)).toBe('jazz festival');
  });
});
