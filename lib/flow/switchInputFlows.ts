import type Homey from 'homey';
import { safeTriggerDeviceCard } from '../safeFunctions.js';
import type ShellyApp from '../../app.js';
import type { SwitchIndicesDeviceInterface } from '../capabilityInterfaces.js';

export async function safeTriggerSingleInputSwitchChanged(device: Homey.Device, value: boolean): Promise<void> {
  const args = { value: value };
  await safeTriggerDeviceCard(device, 'shelly_single_input_switch_changed', args, args);
}

export async function safeTriggerInputSwitchChanged(
  device: Homey.Device,
  inputIndex: number,
  value: boolean,
): Promise<void> {
  const args = { input: inputIndex, value: value };
  await safeTriggerDeviceCard(device, 'shelly_input_switch_changed', args, args);
}

export function registerSwitchInputFlowCards(app: ShellyApp): void {
  const switchInputAutocompleteListener = (
    query: string,
    { device }: { device: SwitchIndicesDeviceInterface },
  ): { name: string; id: number | 'any' }[] => {
    const items: Array<{ name: string; id: number | 'any' }> = device.getSwitchIndices().map(index => ({
      name: (app.homey.__(`switch._name`) ?? '').replace('__number__', String(index + 1)),
      id: index,
    }));

    items.unshift({ id: 'any', name: app.homey.__('switch._any') ?? '' });

    return items.filter(item => item.name.toLowerCase().includes(query.trim().toLowerCase()));
  };

  app.homey.flow
    .getDeviceTriggerCard('shelly_single_input_switch_changed')
    .registerRunListener((flowArgs: { value: ('on' | 'off')[] }, triggerArgs: { value: boolean }) => {
      return flowArgs.value.includes(triggerArgs.value ? 'on' : 'off');
    });

  app.homey.flow
    .getDeviceTriggerCard('shelly_input_switch_changed')
    .registerArgumentAutocompleteListener('input', switchInputAutocompleteListener)
    .registerRunListener(
      (
        flowArgs: { value: ('on' | 'off')[]; input: { name: string; id: number | 'any' } },
        triggerArgs: { input: number; value: boolean },
      ) => {
        const inputMatches = flowArgs.input.id === 'any' || flowArgs.input.id === triggerArgs.input;
        const valueMatches = flowArgs.value.includes(triggerArgs.value ? 'on' : 'off');
        return inputMatches && valueMatches;
      },
    );
}
