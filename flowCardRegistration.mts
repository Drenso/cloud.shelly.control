import type ShellyApp from './app.mjs';
import type ShellyLocalDevice from './lib/Device.mjs';
import type Input from './lib/component/components/Input.mjs';

export async function registerFlowCards(app: ShellyApp): Promise<void> {
  app.homey.flow
    .getDeviceTriggerCard('input_multiple_switch_event')
    .registerArgumentAutocompleteListener(
      'switch',
      (query, { value, device }: { value: boolean; device: ShellyLocalDevice }) => {
        if (device.virtualDevice === undefined) {
          return [];
        }

        const switchInputs = device.virtualDevice.getInputTypes()['switch'];

        const deviceSwitchInputs: Input[] = [];
        for (const inputId of switchInputs) {
          const inputComponent = device.virtualComponents.get(inputId) as Input | undefined;
          if (inputComponent !== undefined) {
            deviceSwitchInputs.push(inputComponent);
          }
        }
        return deviceSwitchInputs.map(input => ({
          name: input.config.name ?? `Input ${input.id + 1}`,
          id: input.id,
        }));
      },
    );
}
