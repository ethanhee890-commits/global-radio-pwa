import { Check, ChevronDown, Globe2, Languages, SlidersHorizontal, Tag } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { RadioBrowserFilterOption, RadioBrowserFilterOptions } from '../lib/radioBrowser';

export type RadioFilters = {
  country: string;
  language: string;
  tag: string;
  sort: 'quality' | 'popular' | 'name';
};

type FilterOption = RadioBrowserFilterOption;

const GENERAL_GENRE_OPTIONS: RadioBrowserFilterOption[] = [
  { label: '전체', value: '' },
  { label: '페스티벌/라이브', value: 'festival' },
  { label: 'Jazz', value: 'jazz' },
  { label: 'News', value: 'news' },
  { label: 'Lofi', value: 'lofi' },
  { label: 'Talk', value: 'talk' }
];

const JAPAN_GENRE_OPTIONS: RadioBrowserFilterOption[] = [
  { label: '일본 추천', value: 'japan-priority' },
  { label: '공개 FM', value: 'terrestrial-fm' },
  { label: 'NHK/뉴스', value: 'nhk' }
];

const SORT_OPTIONS: Array<FilterOption & { value: RadioFilters['sort'] }> = [
  { label: '품질순', value: 'quality' },
  { label: '인기순', value: 'popular' },
  { label: '이름순', value: 'name' }
];

function uniqueOptions(options: RadioBrowserFilterOption[]): RadioBrowserFilterOption[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = option.value.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isJapanCountry(country: string): boolean {
  return country === 'Japan' || country.toUpperCase() === 'JP';
}

function getGenreOptions(country: string, globalTags: RadioBrowserFilterOption[]): FilterOption[] {
  const baseOptions = globalTags.length > 0 ? uniqueOptions([globalTags[0] ?? GENERAL_GENRE_OPTIONS[0], GENERAL_GENRE_OPTIONS[1], ...globalTags.slice(1)]) : GENERAL_GENRE_OPTIONS;

  if (!isJapanCountry(country)) {
    return baseOptions;
  }

  return uniqueOptions([baseOptions[0] ?? GENERAL_GENRE_OPTIONS[0], ...JAPAN_GENRE_OPTIONS, ...baseOptions.slice(1)]);
}

// eslint-disable-next-line react-refresh/only-export-components
export const __filterBarTestHooks = {
  getGenreOptions
};

function hasOptionValue(options: FilterOption[], value: string): boolean {
  return options.some((option) => option.value === value);
}

function FilterSelect({
  label,
  icon,
  value,
  options,
  onChange
}: {
  label: string;
  icon: ReactNode;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : value ? { label: value, value } : options[0];
  const labelId = `${id}-label`;
  const triggerId = `${id}-trigger`;
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function focusOption(index: number) {
    window.requestAnimationFrame(() => {
      rootRef.current?.querySelectorAll<HTMLButtonElement>('.filter-select-option')[index]?.focus();
    });
  }

  function openAndFocus(index = selectedIndex >= 0 ? selectedIndex : 0) {
    setOpen(true);
    focusOption(index);
  }

  function choose(option: FilterOption) {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="filter-select" ref={rootRef}>
      <span className="filter-select-label" id={labelId}>
        {icon}
        {label}
      </span>
      <button
        ref={triggerRef}
        id={triggerId}
        className="filter-select-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={`${labelId} ${triggerId}`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            openAndFocus(event.key === 'ArrowDown' ? 0 : options.length - 1);
          }
        }}
      >
        <span>{selected.label}</span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>
      {open ? (
        <div className="filter-select-menu" id={listboxId} role="listbox" aria-labelledby={labelId}>
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <button
                className={`filter-select-option ${isSelected ? 'is-selected' : ''}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                key={`${option.value}-${option.label}`}
                onClick={() => choose(option)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    const direction = event.key === 'ArrowDown' ? 1 : -1;
                    focusOption((index + direction + options.length) % options.length);
                  }
                }}
              >
                <span>{option.label}</span>
                {isSelected ? <Check aria-hidden="true" size={15} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function FilterBar({
  filters,
  onChange,
  options
}: {
  filters: RadioFilters;
  onChange: (filters: RadioFilters) => void;
  options: RadioBrowserFilterOptions;
}) {
  const genreOptions = getGenreOptions(filters.country, options.tags);
  const selectedGenreValue = hasOptionValue(genreOptions, filters.tag) ? filters.tag : '';

  function changeCountry(country: string) {
    const nextGenreOptions = getGenreOptions(country, options.tags);
    const nextTag = hasOptionValue(nextGenreOptions, filters.tag) ? filters.tag : '';
    onChange({ ...filters, country, tag: nextTag });
  }

  return (
    <section className="filter-bar" aria-label="방송국 필터">
      <FilterSelect
        label="국가"
        icon={<Globe2 aria-hidden="true" size={15} />}
        value={filters.country}
        options={options.countries}
        onChange={changeCountry}
      />
      <FilterSelect
        label="언어"
        icon={<Languages aria-hidden="true" size={15} />}
        value={filters.language}
        options={options.languages}
        onChange={(language) => onChange({ ...filters, language })}
      />
      <FilterSelect
        label="장르"
        icon={<Tag aria-hidden="true" size={15} />}
        value={selectedGenreValue}
        options={genreOptions}
        onChange={(tag) => onChange({ ...filters, tag })}
      />
      <FilterSelect
        label="정렬"
        icon={<SlidersHorizontal aria-hidden="true" size={15} />}
        value={filters.sort}
        options={SORT_OPTIONS}
        onChange={(sort) => onChange({ ...filters, sort: sort as RadioFilters['sort'] })}
      />
    </section>
  );
}
