import type { RadioStation, StoredStation } from '../types/station';
import { toStoredStation } from './globalRadioStorage';

const HAVE_CURRENT_DATA = 2;

export function isDirectPlaybackStalled(readyState: number): boolean {
  return readyState < HAVE_CURRENT_DATA;
}

export function isStalePlaybackAttempt(currentAttemptId: number, attemptId: number): boolean {
  return currentAttemptId !== attemptId;
}

export function withPlaybackCheckStatus(station: RadioStation, lastcheckok: 0 | 1): RadioStation {
  return {
    ...station,
    lastcheckok
  };
}

export function replaceStationById(stations: RadioStation[], station: RadioStation): RadioStation[] {
  let changed = false;
  const nextStations = stations.map((item) => {
    if (item.stationuuid !== station.stationuuid) {
      return item;
    }

    changed = true;
    return station;
  });

  return changed ? nextStations : stations;
}

export function replaceStoredStationById(stations: StoredStation[], station: RadioStation): StoredStation[] {
  let changed = false;
  const storedStation = toStoredStation(station);
  const nextStations = stations.map((item) => {
    if (item.stationuuid !== station.stationuuid) {
      return item;
    }

    changed = true;
    return storedStation;
  });

  return changed ? nextStations : stations;
}
