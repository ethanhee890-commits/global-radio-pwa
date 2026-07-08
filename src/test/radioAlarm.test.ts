import { describe, expect, it } from 'vitest';
import { DEFAULT_RADIO_ALARM, getAlarmDelayMs, getNextAlarmDate, isValidAlarmTime, markAlarmTriggered, shouldTriggerAlarm, toLocalDateKey } from '../lib/radioAlarm';
import type { RadioAlarmSettings, StoredStation } from '../types/station';

const storedStation: StoredStation = {
  stationuuid: 'seed-jp-nhk-world-radio',
  name: 'NHK WORLD-JAPAN Radio',
  url: 'https://example.com/radio.m3u8',
  url_resolved: 'https://example.com/radio.m3u8',
  country: 'Japan',
  countrycode: 'JP',
  language: 'japanese',
  tags: 'japan,nhk',
  codec: 'AAC',
  bitrate: 96,
  hls: 1,
  lastcheckok: 1,
  ssl_error: 0,
  source: 'seed'
};

function alarm(overrides: Partial<RadioAlarmSettings> = {}): RadioAlarmSettings {
  return {
    ...DEFAULT_RADIO_ALARM,
    enabled: true,
    time: '07:30',
    station: storedStation,
    ...overrides
  };
}

describe('radio alarm scheduling', () => {
  it('accepts only 24-hour HH:mm alarm times', () => {
    expect(isValidAlarmTime('07:30')).toBe(true);
    expect(isValidAlarmTime('23:59')).toBe(true);
    expect(isValidAlarmTime('24:00')).toBe(false);
    expect(isValidAlarmTime('7:30')).toBe(false);
  });

  it('schedules today when the alarm time has not passed', () => {
    const now = new Date('2026-07-08T06:10:00');
    const next = getNextAlarmDate(alarm(), now);

    expect(next?.toISOString()).toBe(new Date('2026-07-08T07:30:00').toISOString());
    expect(getAlarmDelayMs(alarm(), now)).toBe(80 * 60 * 1000);
  });

  it('schedules tomorrow when the alarm time already passed', () => {
    const now = new Date('2026-07-08T08:10:00');
    const next = getNextAlarmDate(alarm(), now);

    expect(next?.getDate()).toBe(9);
    expect(next?.getHours()).toBe(7);
    expect(next?.getMinutes()).toBe(30);
  });

  it('does not trigger the same daily alarm twice', () => {
    const now = new Date('2026-07-08T07:30:20');
    const triggered = markAlarmTriggered(alarm(), now);

    expect(toLocalDateKey(now)).toBe('2026-07-08');
    expect(shouldTriggerAlarm(alarm(), now)).toBe(true);
    expect(shouldTriggerAlarm(triggered, now)).toBe(false);
  });

  it('does not schedule disabled or stationless alarms', () => {
    expect(getNextAlarmDate(alarm({ enabled: false }))).toBeNull();
    expect(getNextAlarmDate(alarm({ station: null }))).toBeNull();
  });
});
