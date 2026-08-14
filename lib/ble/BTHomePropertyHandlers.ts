import { safeSetCapabilityValue, safeTriggerDeviceCard } from '../safeFunctions.js';
import type ShellyBleDevice from './BleDevice.js';
import { BTHomeButtonEventType, type BTHomeData } from './BTHome.js';

export type ButtonEventType =
  | 'single_press'
  | 'double_press'
  | 'triple_press'
  | 'long_press'
  | 'long_double_press'
  | 'long_triple_press'
  | 'hold';

export async function handleBatteryProperty(device: ShellyBleDevice, btHomeData: BTHomeData): Promise<void> {
  if (btHomeData.battery?.length !== 1) {
    return;
  }

  await safeSetCapabilityValue(device, 'measure_battery', btHomeData.battery[0]);
}

export async function handleSingleButtonEventProperty(device: ShellyBleDevice, btHomeData: BTHomeData): Promise<void> {
  if (btHomeData.buttonEvent?.length !== 1) {
    return;
  }

  const eventType = await convertButtonEventType(btHomeData.buttonEvent[0]);
  if (!eventType) {
    return;
  }

  const args: { press_type: ButtonEventType } = { press_type: eventType };
  await safeTriggerDeviceCard(device, 'shelly_single_button_pressed', args, args);
}

export async function handleButtonEventProperty(device: ShellyBleDevice, btHomeData: BTHomeData): Promise<void> {
  const buttonCount = btHomeData.buttonEvent?.length ?? 0;
  if (buttonCount === 0) {
    return;
  }

  for (let buttonIndex = 0; buttonIndex < buttonCount; buttonIndex++) {
    const buttonEvent: BTHomeButtonEventType = btHomeData.buttonEvent![buttonIndex];
    const eventType = await convertButtonEventType(buttonEvent);
    if (!eventType) {
      continue;
    }

    const args: { button: number; press_type: ButtonEventType } = { button: buttonIndex, press_type: eventType };
    await safeTriggerDeviceCard(device, 'shelly_button_pressed', args, args);
  }
}

async function convertButtonEventType(buttonEvent: BTHomeButtonEventType): Promise<ButtonEventType | null> {
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
