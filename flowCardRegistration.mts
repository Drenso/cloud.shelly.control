import type ShellyApp from './app.mjs';
import type ShellyLocalDevice from './lib/Device.mjs';
import Input from './lib/component/components/Input.mjs';

export async function registerFlowCards(app: ShellyApp): Promise<void> {
  app.homey.flow
    .getDeviceTriggerCard('input_switch_event')
    .registerRunListener((flowArgs: { value: ('on' | 'off')[] }, triggerArgs: { value: boolean; switch: number }) => {
      const stateMatches = flowArgs.value.includes(triggerArgs.value ? 'on' : 'off');
      return stateMatches;
    });

  app.homey.flow
    .getDeviceTriggerCard('input_multiple_switch_event')
    .registerArgumentAutocompleteListener(
      'switch',
      (query, { value, device }: { value: boolean; device: ShellyLocalDevice }) => {
        if (device.virtualDevice === undefined) {
          return [];
        }

        const switchInputs = Input.getInputTypes(device.virtualDevice)['switch'];

        const deviceSwitchInputs: Input[] = [];
        for (const inputId of switchInputs) {
          const inputComponent = device.virtualComponents.get(inputId) as Input | undefined;
          if (inputComponent !== undefined) {
            deviceSwitchInputs.push(inputComponent);
          }
        }
        return deviceSwitchInputs.map(input => ({
          name: input.config.name ?? `Input ${input.id + 1}`,
          id: input.id + 1,
        }));
      },
    )
    .registerRunListener(
      (
        flowArgs: { value: ('on' | 'off')[]; switch: { id: number } },
        triggerArgs: { value: boolean; switch: number },
      ) => {
        const switchMatches = flowArgs.switch.id === triggerArgs.switch;
        const stateMatches = flowArgs.value.includes(triggerArgs.value ? 'on' : 'off');
        return switchMatches && stateMatches;
      },
    );
}
