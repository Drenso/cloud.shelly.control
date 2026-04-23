import type ShellyLocalDevice from '../../local/LocalDevice.js';
import type { NameSpace } from '../components/Shelly/ListMethods.js';

export function parseNightModeActiveBetween(
  homeyDevice: ShellyLocalDevice,
  component: NameSpace,
  rawStart: `${number}:${number}`,
  rawEnd: `${number}:${number}`,
): {
  active_between: [`${number}:${number}`, `${number}:${number}`];
} {
  const [rawStartHour, rawStartMinutes, ...startRest] = rawStart.split(':');
  const [rawEndHour, rawEndMinutes, ...endRest] = rawEnd.split(':');

  const startHour = parseInt(rawStartHour, 10);
  const startMinutes = parseInt(rawStartMinutes, 10);
  const endHour = parseInt(rawEndHour, 10);
  const endMinutes = parseInt(rawEndMinutes, 10);

  const invalidStart =
    startRest.length > 0 ||
    isNaN(startHour) ||
    isNaN(startMinutes) ||
    startHour < 0 ||
    startMinutes < 0 ||
    startHour >= 24 ||
    startMinutes >= 60;

  const invalidEnd =
    endRest.length > 0 ||
    isNaN(endHour) ||
    isNaN(endMinutes) ||
    endHour < 0 ||
    endMinutes < 0 ||
    endHour >= 24 ||
    endMinutes >= 60;

  // Invalid argument 'night_mode.active_between': Time range must be between [00:00, 23:59]!
  if (invalidStart && invalidEnd) {
    throw new Error(homeyDevice.homey.__(`component.${component}.invalid_night_mode.start_and_end`));
  }

  if (invalidStart) {
    throw new Error(homeyDevice.homey.__(`component.${component}.invalid_night_mode.start`));
  }

  if (invalidEnd) {
    throw new Error(homeyDevice.homey.__(`component.${component}.invalid_night_mode.end`));
  }

  return { active_between: [rawStart, rawEnd] };
}
