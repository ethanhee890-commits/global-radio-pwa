import { describe, expect, it } from 'vitest';
import { __globalRadioTestHooks } from '../GlobalRadioApp';

describe('global radio alarm settings', () => {
  it('keeps alarm helper copy scoped to the current platform', () => {
    expect(__globalRadioTestHooks.getAlarmHelperCopy('web')).toBe(
      '웹에서는 지정 시간 자동 재생 알람을 지원하지 않아요. 앱에서 설정해 주세요.'
    );
    expect(__globalRadioTestHooks.getAlarmHelperCopy('android')).toBe(
      '권한을 허용하면 설정한 시간에 선택한 방송이 자동으로 재생됩니다.'
    );
    expect(__globalRadioTestHooks.getAlarmHelperCopy('ios')).toBe(
      '설정한 시간에 알림을 보내드려요. 알림을 탭한 뒤 앱에서 선택한 방송을 재생해 주세요.'
    );
  });

  it('clamps alarm input to valid hour and minute ranges without fixed leading zero input', () => {
    expect(__globalRadioTestHooks.clampTimePart(Number('023'), 23)).toBe(23);
    expect(__globalRadioTestHooks.clampTimePart(Number('056'), 59)).toBe(56);
    expect(__globalRadioTestHooks.clampTimePart(Number('99'), 23)).toBe(23);
    expect(__globalRadioTestHooks.clampTimePart(Number('99'), 59)).toBe(59);
    expect(__globalRadioTestHooks.clampTimePart(Number.NaN, 23)).toBe(0);
  });

  it('formats the saved alarm time only for display', () => {
    expect(__globalRadioTestHooks.formatAlarmTime(7, 5)).toBe('07:05');
    expect(__globalRadioTestHooks.formatAlarmTime(13, 15)).toBe('13:15');
  });
});
