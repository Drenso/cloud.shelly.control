import type ShellyZWaveDevice from '../ZWaveDevice.js';
import { safeAddCapability, safeRemoveCapability } from '../../safeFunctions.js';
import * as ButtonZWaveHandler from './ButtonZWaveHandler.js';

export async function configureDevice(device: ShellyZWaveDevice): Promise<void> {
  await ButtonZWaveHandler.configureDevice(device);
  await device
    .getConfigurationBulk(7, 1)
    .then(async res => {
      const detached = res[0].readUInt8() === 1;
      if (detached) {
        await safeAddCapability(device, 'hidden.single_button_pressed');
      } else {
        await safeRemoveCapability(device, 'hidden.single_button_pressed');
      }
      await device.setSettings({
        zwaveSwitchDetachedModeSW1: detached ? '1' : '0',
      });
    })
    .catch(err => device.error('Error while getting initial detached input setting:', err));
}

export async function onSettings(
  device: ShellyZWaveDevice,
  { changedKeys, newSettings }: SettingsEvent<Record<string, boolean | string | number | undefined | null>>,
): Promise<string | void> {
  if (changedKeys.includes('zwaveSwitchDetachedModeSW1')) {
    const detached = newSettings['zwaveSwitchDetachedModeSW1'] === '1';
    if (detached) {
      await safeAddCapability(device, 'hidden.single_button_pressed');
    } else {
      await safeRemoveCapability(device, 'hidden.single_button_pressed');
    }
  }
}
