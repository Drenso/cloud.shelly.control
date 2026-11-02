import type ShellyZWaveDevice from '../ZWaveDevice.js';
import * as ButtonZWaveHandler from './ButtonZWaveHandler.js';
import { safeAddCapability, safeRemoveCapability } from '../../safeFunctions.js';

export async function configureDevice(device: ShellyZWaveDevice, buttonCount: number): Promise<void> {
  await ButtonZWaveHandler.configureDevice(device);

  const settings: Record<string, '1' | '0'> = {};

  await device
    .getConfigurationBulk(7, 2)
    .then(async res => {
      let anyButtonDetached = false;

      for (let buttonIndex = 0; buttonIndex < buttonCount; buttonIndex++) {
        const buttonDetached = res[buttonIndex].readUInt8() === 1;
        settings[`zwaveSwitchDetachedModeSW${buttonIndex + 1}`] = buttonDetached ? '1' : '0';
        anyButtonDetached ||= buttonDetached;
      }

      if (anyButtonDetached) {
        await safeAddCapability(device, 'hidden.button_pressed');
      } else {
        await safeRemoveCapability(device, 'hidden.button_pressed');
      }

      await device.setSettings(settings);
    })
    .catch(err => device.error('Error while getting initial setting values:', err));
}

export async function onSettings(
  device: ShellyZWaveDevice,
  { changedKeys, newSettings }: SettingsEvent<Record<string, boolean | string | number | undefined | null>>,
  buttonCount: number,
): Promise<string | void> {
  for (const changedKey of changedKeys) {
    if (changedKey.startsWith('zwaveSwitchDetachedModeSW')) {
      let anyButtonDetached = false;

      for (let buttonIndex = 0; buttonIndex < buttonCount; buttonIndex++) {
        const buttonDetached = newSettings[`zwaveSwitchDetachedModeSW${buttonIndex + 1}`] === '1';
        anyButtonDetached ||= buttonDetached;
      }

      if (anyButtonDetached) {
        await safeAddCapability(device, 'hidden.button_pressed');
      } else {
        await safeRemoveCapability(device, 'hidden.button_pressed');
      }

      break;
    }
  }
}
