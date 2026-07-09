import { describe, expect, it } from 'vitest';
import { __filterBarTestHooks } from '../components/FilterBar';
import type { RadioBrowserFilterOptions } from '../lib/radioBrowser';

const options: RadioBrowserFilterOptions = {
  countries: [
    { label: '전체', value: '' },
    { label: 'Japan (JP) · 203', value: 'JP' },
    { label: 'Spain (ES) · 1,333', value: 'ES' }
  ],
  languages: [
    { label: '전체', value: '' },
    { label: 'Japanese', value: 'japanese' }
  ],
  tags: [
    { label: '전체', value: '' },
    { label: 'Jazz', value: 'jazz' },
    { label: 'News', value: 'news' }
  ],
  source: 'radio-browser'
};

describe('FilterBar genre options', () => {
  it('does not render Japan-only genre choices when country is all countries', () => {
    const labels = __filterBarTestHooks.getGenreOptions('', options.tags).map((option) => option.label);

    expect(labels).toContain('페스티벌/라이브');
    expect(labels).toContain('Jazz');
    expect(labels).not.toContain('일본 추천');
    expect(labels).not.toContain('공개 FM');
    expect(labels).not.toContain('NHK/뉴스');
  });

  it('renders Japan-only genre choices only when Japan is selected', () => {
    const labels = __filterBarTestHooks.getGenreOptions('JP', options.tags).map((option) => option.label);

    expect(labels).toContain('일본 추천');
    expect(labels).toContain('공개 FM');
    expect(labels).toContain('NHK/뉴스');
  });
});
