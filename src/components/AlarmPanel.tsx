import { AlarmClock, Bell, Radio } from 'lucide-react';
import { getNextAlarmDate, isValidAlarmTime } from '../lib/radioAlarm';
import type { RadioAlarmSettings, RadioStation } from '../types/station';

function formatNextAlarm(alarm: RadioAlarmSettings): string {
  const next = getNextAlarmDate(alarm);
  if (!next) {
    return '알람을 켜고 방송국을 지정하면 다음 실행 시간이 표시됩니다.';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(next);
}

export function AlarmPanel({
  alarm,
  selectedStation,
  onChange,
  onUseSelectedStation,
  onTestAlarm
}: {
  alarm: RadioAlarmSettings;
  selectedStation: RadioStation | null;
  onChange: (alarm: RadioAlarmSettings) => void;
  onUseSelectedStation: () => void;
  onTestAlarm: () => void;
}) {
  const canEnable = Boolean(alarm.station) && isValidAlarmTime(alarm.time);

  return (
    <section className="alarm-panel" aria-label="라디오 알람">
      <div className="section-heading">
        <div>
          <span>Morning Radio</span>
          <h2>라디오 알람</h2>
        </div>
        <AlarmClock aria-hidden="true" size={22} />
      </div>

      <div className="alarm-grid">
        <label className="alarm-time-field">
          <span>알람 시간</span>
          <input type="time" value={alarm.time} onChange={(event) => onChange({ ...alarm, time: event.target.value })} />
        </label>

        <label className="alarm-toggle">
          <input
            type="checkbox"
            checked={alarm.enabled}
            disabled={!canEnable}
            onChange={(event) => onChange({ ...alarm, enabled: event.target.checked })}
          />
          <span>
            <strong>매일 이 시간에 재생 시도</strong>
            <small>앱이 열려 있고 브라우저가 재생을 허용하면 선택한 채널을 시작합니다.</small>
          </span>
        </label>
      </div>

      <div className="alarm-station-card">
        <Radio aria-hidden="true" size={18} />
        <div>
          <span>알람 채널</span>
          <strong>{alarm.station ? alarm.station.name : '아직 지정되지 않음'}</strong>
          <small>{alarm.station ? [alarm.station.country, alarm.station.language].filter(Boolean).join(' / ') : '목록에서 방송국을 선택한 뒤 아래 버튼으로 지정해 주세요.'}</small>
        </div>
      </div>

      <div className="alarm-actions">
        <button className="radio-button secondary" type="button" onClick={onUseSelectedStation} disabled={!selectedStation}>
          <Bell aria-hidden="true" size={16} />
          선택한 채널로 설정
        </button>
        <button className="radio-button secondary" type="button" onClick={onTestAlarm} disabled={!alarm.station}>
          지금 테스트
        </button>
      </div>

      <p className="alarm-next">다음 알람: {formatNextAlarm(alarm)}</p>
      <p className="alarm-limit-note">
        모바일 브라우저는 사용자 동작 없이 소리를 자동 재생하지 못할 수 있습니다. 자동 재생이 막히면 바로 재생 버튼을 다시 누를 수 있게 안내합니다.
      </p>
    </section>
  );
}
