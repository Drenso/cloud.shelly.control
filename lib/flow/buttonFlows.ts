import type Homey from 'homey';
import type ShellyApp from '../../app.js';
import type { ButtonCountDeviceInterface, ButtonEventTypesDeviceInterface } from '../capabilityInterfaces.js';
import { safeTriggerDeviceCard } from '../safeFunctions.js';

export type ButtonEventType =
  | 'single_press'
  | 'double_press'
  | 'triple_press'
  | 'long_press'
  | 'long_double_press'
  | 'long_triple_press'
  | 'hold';

export async function safeTriggerSingleButtonPressed(device: Homey.Device, eventType: ButtonEventType): Promise<void> {
  const args: { press_type: ButtonEventType } = { press_type: eventType };
  await safeTriggerDeviceCard(device, 'shelly_single_button_pressed', args, args);
}

export async function safeTriggerButtonPressed(
  device: Homey.Device,
  buttonIndex: number,
  eventType: ButtonEventType,
): Promise<void> {
  const args: { button: number; press_type: ButtonEventType } = { button: buttonIndex, press_type: eventType };
  await safeTriggerDeviceCard(device, 'shelly_button_pressed', args, args);
}

export function registerButtonFlowCards(app: ShellyApp): void {
  const buttonAutocompleteListener = (
    query: string,
    { device }: { device: ButtonCountDeviceInterface },
  ): Array<{ name: string; id: number | 'any' }> => {
    const items: Array<{ name: string; id: number | 'any' }> = [...Array(device.getButtonCount())].map((_, index) => ({
      name: (app.homey.__(`button._name`) ?? '').replace('__number__', String(index + 1)),
      id: index,
    }));

    items.unshift({ id: 'any', name: app.homey.__('button._any') ?? '' });

    return items.filter(item => item.name.toLowerCase().includes(query.trim().toLowerCase()));
  };

  const buttonPressTypeAutocompleteListener = (
    query: string,
    { device }: { device: ButtonEventTypesDeviceInterface },
  ): Array<{ name: string; id: ButtonEventType | 'any_press' }> => {
    const items: Array<{ name: string; id: ButtonEventType | 'any_press' }> = device
      .getButtonEventTypes()
      .map(eventType => ({ name: app.homey.__(`button.press_type.${eventType}`) ?? '', id: eventType }));

    items.unshift({ id: 'any_press', name: app.homey.__('button.press_type._any_press') ?? '' });

    return items.filter(item => item.name.toLowerCase().includes(query.trim().toLowerCase()));
  };

  app.homey.flow
    .getDeviceTriggerCard('shelly_single_button_pressed')
    .registerArgumentAutocompleteListener('press_type', buttonPressTypeAutocompleteListener)
    .registerRunListener(
      (
        flowArgs: { press_type: { name: string; id: ButtonEventType | 'any_press' } },
        triggerArgs: { press_type: ButtonEventType },
      ) => {
        if (flowArgs.press_type.id === 'any_press') {
          return true;
        }

        return flowArgs.press_type.id === triggerArgs.press_type;
      },
    );

  app.homey.flow
    .getDeviceTriggerCard('shelly_button_pressed')
    .registerArgumentAutocompleteListener('button', buttonAutocompleteListener)
    .registerArgumentAutocompleteListener('press_type', buttonPressTypeAutocompleteListener)
    .registerRunListener(
      (
        flowArgs: {
          button: { name: string; id: number | 'any' };
          press_type: { name: string; id: ButtonEventType | 'any_press' };
        },
        triggerArgs: { button: number; press_type: ButtonEventType },
      ) => {
        if (
          flowArgs.button.id === 'any' &&
          flowArgs.press_type.id === 'any_press' &&
          triggerArgs.press_type !== 'hold'
        ) {
          return true;
        }

        if (flowArgs.button.id === 'any' && flowArgs.press_type.id === triggerArgs.press_type) {
          return true;
        }

        return flowArgs.button.id === triggerArgs.button && flowArgs.press_type.id === triggerArgs.press_type;
      },
    );
}
