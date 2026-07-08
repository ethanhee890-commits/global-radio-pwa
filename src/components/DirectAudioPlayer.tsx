import { Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { RefObject } from 'react';
import type { PlaybackStatus, RadioStation } from '../types/station';

export function DirectAudioPlayer({
  audioRef,
  station,
  status,
  error,
  onPlay,
  onPause,
  onRetry
}: {
  audioRef: RefObject<HTMLAudioElement>;
  station: RadioStation | null;
  status: PlaybackStatus;
  error: string;
  onPlay: () => void;
  onPause: () => void;
  onRetry: () => void;
}) {
  return (
    <section className="direct-player" aria-label="라디오 스트림 플레이어">
      <div className="player-heading">
        <Volume2 aria-hidden="true" size={20} />
        <div>
          <strong>Radio Stream</strong>
          <span>{station ? station.name : '방송국을 선택해 주세요.'}</span>
        </div>
      </div>

      <div className="player-controls">
        {status === 'playing' ? (
          <button className="radio-button secondary" type="button" onClick={onPause} aria-label="라디오 일시정지">
            <Pause aria-hidden="true" size={17} />
            일시정지
          </button>
        ) : (
          <button className="radio-button primary" type="button" onClick={onPlay} disabled={!station || status === 'loading'} aria-label="라디오 재생하기">
            <Play aria-hidden="true" size={17} />
            {status === 'loading' ? '재생 준비 중' : '재생하기'}
          </button>
        )}
        <button className="radio-button secondary" type="button" onClick={onRetry} disabled={!station || status === 'loading'} aria-label="라디오 다시 시도하기">
          <RotateCcw aria-hidden="true" size={16} />
          다시 시도하기
        </button>
      </div>

      <audio ref={audioRef} className="native-audio" controls preload="none" />

      {status === 'autoplay_blocked' ? <p className="player-warning">브라우저 정책상 재생 버튼을 한 번 더 눌러야 합니다.</p> : null}
      {status === 'error' && error ? <p className="player-error">{error}</p> : null}
    </section>
  );
}
