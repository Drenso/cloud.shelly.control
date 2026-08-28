import { type ButtonEventType, safeTriggerButtonPressed, safeTriggerSingleButtonPressed } from '../flow/buttonFlows.js';
import type { ShellyIlluminanceType } from '../flow/illuminanceFlows.js';
import { safeSetCapabilityValue } from '../safeFunctions.js';
import type ShellyBleDevice from './BleDevice.js';
import { BTHomeButtonEventType, type BTHomeData, BTHomeLightLevel } from './BTHome.js';

type BtHomeDataHandlerOptions = {
  capabilityId?: string;
  addIfNotExists?: boolean;
};

export async function handleBatteryProperty(
  device: ShellyBleDevice,
  btHomeData: BTHomeData,
  options?: BtHomeDataHandlerOptions,
): Promise<void> {
  if (btHomeData.battery?.length !== 1) {
    return;
  }

  await safeSetCapabilityValue(
    device,
    options?.capabilityId ?? 'measure_battery',
    btHomeData.battery[0],
    options?.addIfNotExists,
  );
}

export async function handleDistanceProperty(
  device: ShellyBleDevice,
  btHomeData: BTHomeData,
  options?: BtHomeDataHandlerOptions,
): Promise<void> {
  if (btHomeData.distance?.length !== 1) {
    return;
  }

  const value = btHomeData.distance[0] === 0 ? null : btHomeData.distance[0] / 1000;
  await safeSetCapabilityValue(device, options?.capabilityId ?? 'measure_distance', value, options?.addIfNotExists);
}

export async function handleHumidityProperty(
  device: ShellyBleDevice,
  btHomeData: BTHomeData,
  options?: BtHomeDataHandlerOptions,
): Promise<void> {
  if (btHomeData.humidity?.length !== 1) {
    return;
  }

  await safeSetCapabilityValue(
    device,
    options?.capabilityId ?? 'measure_humidity',
    btHomeData.humidity[0],
    options?.addIfNotExists,
  );
}

export async function handleIlluminanceProperty(
  device: ShellyBleDevice,
  btHomeData: BTHomeData,
  options?: BtHomeDataHandlerOptions,
): Promise<void> {
  if (btHomeData.illuminance?.length !== 1) {
    return;
  }

  await safeSetCapabilityValue(
    device,
    options?.capabilityId ?? 'measure_luminance',
    btHomeData.illuminance[0],
    options?.addIfNotExists,
  );
}

export async function handleLightLevelProperty(
  device: ShellyBleDevice,
  btHomeData: BTHomeData,
  options?: BtHomeDataHandlerOptions,
): Promise<void> {
  if (btHomeData.lightLevel?.length !== 1) {
    return;
  }

  await safeSetCapabilityValue(
    device,
    options?.capabilityId ?? 'shelly_illumination',
    convertLightLevel(btHomeData.lightLevel[0]),
    options?.addIfNotExists,
  );
}


export async function handleMotionProperty(
  device: ShellyBleDevice,
  btHomeData: BTHomeData,
  options?: BtHomeDataHandlerOptions,
): Promise<void> {
  if (btHomeData.motion?.length !== 1) {
    return;
  }

  await safeSetCapabilityValue(
    device,
    options?.capabilityId ?? 'alarm_motion',
    btHomeData.motion[0],
    options?.addIfNotExists,
  );
}

export async function handleRotationProperty(
  device: ShellyBleDevice,
  btHomeData: BTHomeData,
  options?: BtHomeDataHandlerOptions,
): Promise<void> {
  if (btHomeData.rotation?.length !== 1) {
    return;
  }

  await safeSetCapabilityValue(
    device,
    options?.capabilityId ?? 'measure_rotation',
    btHomeData.rotation[0],
    options?.addIfNotExists,
  );
}

export async function handleTemperatureProperty(
  device: ShellyBleDevice,
  btHomeData: BTHomeData,
  options?: BtHomeDataHandlerOptions,
): Promise<void> {
  if (btHomeData.temperature?.length !== 1) {
    return;
  }

  await safeSetCapabilityValue(
    device,
    options?.capabilityId ?? 'measure_temperature',
    btHomeData.temperature[0],
    options?.addIfNotExists,
  );
}

export async function handleVibrationProperty(
  device: ShellyBleDevice,
  btHomeData: BTHomeData,
  options?: BtHomeDataHandlerOptions,
): Promise<void> {
  if (btHomeData.vibration?.length !== 1) {
    return;
  }

  await safeSetCapabilityValue(
    device,
    options?.capabilityId ?? 'alarm_vibration',
    btHomeData.vibration[0],
    options?.addIfNotExists,
  );
}

export async function handleWindowProperty(
  device: ShellyBleDevice,
  btHomeData: BTHomeData,
  options?: BtHomeDataHandlerOptions,
): Promise<void> {
  if (btHomeData.window?.length !== 1) {
    return;
  }

  await safeSetCapabilityValue(
    device,
    options?.capabilityId ?? 'alarm_open',
    btHomeData.window[0],
    options?.addIfNotExists,
  );
}

export async function handleSingleButtonEventProperty(device: ShellyBleDevice, btHomeData: BTHomeData): Promise<void> {
  if (btHomeData.buttonEvent?.length !== 1) {
    return;
  }

  const eventType = convertButtonEventType(btHomeData.buttonEvent[0]);
  if (!eventType) {
    return;
  }

  await safeTriggerSingleButtonPressed(device, eventType);
}

export async function handleButtonEventProperty(device: ShellyBleDevice, btHomeData: BTHomeData): Promise<void> {
  const buttonCount = btHomeData.buttonEvent?.length ?? 0;
  if (buttonCount === 0) {
    return;
  }

  for (let buttonIndex = 0; buttonIndex < buttonCount; buttonIndex++) {
    const buttonEvent: BTHomeButtonEventType = btHomeData.buttonEvent![buttonIndex];
    const eventType = convertButtonEventType(buttonEvent);
    if (!eventType) {
      continue;
    }

    await safeTriggerButtonPressed(device, buttonIndex, eventType);
  }
}

function convertButtonEventType(buttonEvent: BTHomeButtonEventType): ButtonEventType | null {
  switch (buttonEvent) {
    case BTHomeButtonEventType.None:
      return null;
    case BTHomeButtonEventType.Press:
      return 'single_press';
    case BTHomeButtonEventType.DoublePress:
      return 'double_press';
    case BTHomeButtonEventType.TriplePress:
      return 'triple_press';
    case BTHomeButtonEventType.LongPress:
      return 'long_press';
    case BTHomeButtonEventType.LongDoublePress:
      return 'long_double_press';
    case BTHomeButtonEventType.LongTriplePress:
      return 'long_triple_press';
    case BTHomeButtonEventType.HoldPress:
    case BTHomeButtonEventType.HoldPress2:
      return 'hold';
  }
}

function convertLightLevel(lightLevelEvent: BTHomeLightLevel): ShellyIlluminanceType {
  switch (lightLevelEvent) {
    case BTHomeLightLevel.Dark:
      return 'dark';
    case BTHomeLightLevel.Twilight:
      return 'twilight';
    case BTHomeLightLevel.Bright:
      return 'bright';
  }
}
