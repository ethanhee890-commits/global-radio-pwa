import type { RadioAlarmSettings } from '../types/station';

export const DEFAULT_RADIO_ALARM: RadioAlarmSettings = {
  enabled: false,
  time: '07:00',
  station: null,
  lastTriggeredDate: ''
};

export function isValidAlarmTime(time: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function scheduledDateFor(date: Date, time: string): Date | null {
  if (!isValidAlarmTime(time)) {
    return null;
  }

  const [hours, minutes] = time.split(':').map(Number);
  const scheduled = new Date(date);
  scheduled.setHours(hours, minutes, 0, 0);
  return scheduled;
}

export function getNextAlarmDate(alarm: RadioAlarmSettings, now = new Date()): Date | null {
  if (!alarm.enabled || !alarm.station || !isValidAlarmTime(alarm.time)) {
    return null;
  }

  const todayAlarm = scheduledDateFor(now, alarm.time);
  if (!todayAlarm) {
    return null;
  }

  const todayKey = toLocalDateKey(now);
  if (todayAlarm.getTime() > now.getTime() && alarm.lastTriggeredDate !== todayKey) {
    return todayAlarm;
  }

  const tomorrowAlarm = new Date(todayAlarm);
  tomorrowAlarm.setDate(tomorrowAlarm.getDate() + 1);
  return tomorrowAlarm;
}

export function getAlarmDelayMs(alarm: RadioAlarmSettings, now = new Date()): number | null {
  const nextAlarm = getNextAlarmDate(alarm, now);
  return nextAlarm ? Math.max(0, nextAlarm.getTime() - now.getTime()) : null;
}

export function shouldTriggerAlarm(alarm: RadioAlarmSettings, now = new Date()): boolean {
  if (!alarm.enabled || !alarm.station || !isValidAlarmTime(alarm.time)) {
    return false;
  }

  const todayAlarm = scheduledDateFor(now, alarm.time);
  if (!todayAlarm) {
    return false;
  }

  const alreadyTriggeredToday = alarm.lastTriggeredDate === toLocalDateKey(now);
  const elapsedMs = now.getTime() - todayAlarm.getTime();
  return !alreadyTriggeredToday && elapsedMs >= 0 && elapsedMs < 60_000;
}

export function markAlarmTriggered(alarm: RadioAlarmSettings, now = new Date()): RadioAlarmSettings {
  return {
    ...alarm,
    lastTriggeredDate: toLocalDateKey(now)
  };
}
