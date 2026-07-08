import { Globe2, Languages, SlidersHorizontal, Tag } from 'lucide-react';

export type RadioFilters = {
  country: string;
  language: string;
  tag: string;
  sort: 'quality' | 'popular' | 'name';
};

const COUNTRY_OPTIONS = [
  { label: '전체', value: '' },
  { label: '일본', value: 'JP' },
  { label: '한국', value: 'KR' },
  { label: '미국', value: 'US' },
  { label: '영국', value: 'GB' },
  { label: '독일', value: 'DE' },
  { label: '프랑스', value: 'FR' },
  { label: '캐나다', value: 'CA' },
  { label: '호주', value: 'AU' },
  { label: '네덜란드', value: 'NL' },
  { label: '브라질', value: 'BR' },
  { label: '스페인', value: 'ES' },
  { label: '이탈리아', value: 'IT' },
  { label: '대만', value: 'TW' },
  { label: '싱가포르', value: 'SG' }
];

const LANGUAGE_OPTIONS = [
  { label: '전체', value: '' },
  { label: '한국어', value: 'korean' },
  { label: '영어', value: 'english' },
  { label: '일본어', value: 'japanese' },
  { label: '독일어', value: 'german' },
  { label: '프랑스어', value: 'french' },
  { label: '스페인어', value: 'spanish' },
  { label: '중국어', value: 'chinese' },
  { label: '음악 중심', value: 'instrumental' }
];

const GENRE_OPTIONS = [
  { label: '전체', value: '' },
  { label: '일본 추천', value: 'japan-priority' },
  { label: '공개 FM', value: 'terrestrial-fm' },
  { label: 'NHK/뉴스', value: 'nhk' },
  { label: 'Jazz', value: 'jazz' },
  { label: 'News', value: 'news' },
  { label: 'K-pop/J-pop', value: 'pop' },
  { label: 'Classical', value: 'classical' },
  { label: 'Rock', value: 'rock' },
  { label: 'Talk', value: 'talk' }
];

export function FilterBar({
  filters,
  onChange
}: {
  filters: RadioFilters;
  onChange: (filters: RadioFilters) => void;
}) {
  return (
    <section className="filter-bar" aria-label="방송국 필터">
      <label>
        <span>
          <Globe2 aria-hidden="true" size={15} />
          국가
        </span>
        <select value={filters.country} onChange={(event) => onChange({ ...filters, country: event.target.value })}>
          {COUNTRY_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>
          <Languages aria-hidden="true" size={15} />
          언어
        </span>
        <select value={filters.language} onChange={(event) => onChange({ ...filters, language: event.target.value })}>
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>
          <Tag aria-hidden="true" size={15} />
          장르
        </span>
        <select value={filters.tag} onChange={(event) => onChange({ ...filters, tag: event.target.value })}>
          {GENRE_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>
          <SlidersHorizontal aria-hidden="true" size={15} />
          정렬
        </span>
        <select value={filters.sort} onChange={(event) => onChange({ ...filters, sort: event.target.value as RadioFilters['sort'] })}>
          <option value="quality">음질순</option>
          <option value="popular">인기순</option>
          <option value="name">이름순</option>
        </select>
      </label>
    </section>
  );
}
