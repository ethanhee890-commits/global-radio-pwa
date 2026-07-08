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
      <label htmlFor="station-search">찾고 싶은 방송</label>
      <div className="radio-search-control">
        <Search aria-hidden="true" size={19} />
        <input
          id="station-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="예: NHK, KEXP, Tokyo, jazz"
          autoComplete="off"
        />
        <button className="radio-button primary" type="submit" disabled={loading}>
          {loading ? '검색 중' : '검색'}
        </button>
      </div>
    </form>
  );
}
