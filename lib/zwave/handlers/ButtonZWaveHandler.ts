import type ShellyZWaveDevice from '../ZWaveDevice.js';
import {
  type ButtonEventType,
  safeTriggerButtonPressed,
  safeTriggerSingleButtonPressed,
} from '../../flow/buttonFlows.js';

export const enum KeyAttributes {
  Pressed = 'Key Pressed 1 time',
  Released = 'Key Released',
  Held = 'Key Held Down',
  Pressed2 = 'Key Pressed 2 times',
  Pressed3 = 'Key Pressed 3 times',
  Pressed4 = 'Key Pressed 4 times',
  Pressed5 = 'Key Pressed 5 times',
}

export type CentralSceneNotification = {
  'Sequence Number (Raw)': Buffer;
  'Sequence Number': number;
  'Properties1 (Raw)': Buffer;
  Properties1: { 'Slow Refresh': boolean; 'Key Attributes': KeyAttributes };
  'Scene Number (Raw)': Buffer;
  'Scene Number': number;
};

export function convertButtonPress(type: KeyAttributes): ButtonEventType | null {
  switch (type) {
    case KeyAttributes.Pressed:
      return 'single_press';
    case KeyAttributes.Held:
      return 'hold';
    case KeyAttributes.Released:
      return 'long_press';
    case KeyAttributes.Pressed2:
      return 'double_press';
    case KeyAttributes.Pressed3:
      return 'triple_press';
    default:
      return null;
  }
}

export async function configureDevice(device: ShellyZWaveDevice): Promise<void> {
  if (device.node.CommandClass['COMMAND_CLASS_CENTRAL_SCENE'] !== undefined) {
    device.registerReportListener(
      'CENTRAL_SCENE',
      'CENTRAL_SCENE_NOTIFICATION',
      (payload: CentralSceneNotification) => {
        device.debug(payload['Scene Number'], payload.Properties1['Key Attributes']);
        const buttonEvent = convertButtonPress(payload.Properties1['Key Attributes']);

        if (buttonEvent === null) {
          device.error('Unsupported Z-Wave key event:', payload.Properties1['Key Attributes']);
          return;
        }

        if (device.getButtonEventTypes && !device.getButtonEventTypes().includes(buttonEvent)) {
          device.error('Unregistered Z-Wave key event:', buttonEvent);
        }

        if (device.hasCapability('hidden.single_button_pressed')) {
          safeTriggerSingleButtonPressed(device, buttonEvent);
        }
        if (device.hasCapability('hidden.button_pressed')) {
          safeTriggerButtonPressed(device, payload['Scene Number'] - 1, buttonEvent);
        }
      },
    );
  }
}
