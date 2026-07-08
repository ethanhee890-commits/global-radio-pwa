import { Search } from 'lucide-react';
import { FormEvent } from 'react';

export function SearchBar({
  query,
  loading,
  onQueryChange,
  onSubmit
}: {
  query: string;
  loading: boolean;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="radio-search" onSubmit={handleSubmit}>
      <label htmlFor="station-search">방송국 검색</label>
      <div className="radio-search-control">
        <Search aria-hidden="true" size={19} />
        <input
          id="station-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="방송국명, 국가, 언어, 장르를 입력해 보세요."
          autoComplete="off"
        />
        <button className="radio-button primary" type="submit" disabled={loading}>
          {loading ? '검색 중' : '검색'}
        </button>
      </div>
    </form>
  );
}
