import type Homey from 'homey';
import type ShellyApp from '../../app.js';
import Illuminance from '../component/components/Illuminance.js';
import ShellyLocalDevice from '../local/LocalDevice.js';
import { translate } from '../util.js';

export type ShellyIlluminanceType = 'dark' | 'twilight' | 'bright';

export function registerIlluminanceFlowCards(app: ShellyApp): void {
  const getIlluminanceComponents = (device: ShellyLocalDevice): Illuminance[] => {
    if (device.virtualDevice === undefined) {
      return [];
    }

    return [...device.virtualComponents.values()].filter(component => component instanceof Illuminance);
  };

  const autoCompleteListener = (
    query: string,
    { device }: { device: Homey.Device },
  ): Array<{ name: string; id: number }> => {
    let items: Array<{ name: string; id: number }> = [];

    if (device instanceof ShellyLocalDevice) {
      items = getIlluminanceComponents(device).map(component => ({
        name: translate(app.homey.__('locale'), component.getTitleTranslations()),
        id: component.id,
      }));
    } else {
      // Non-local device will only have one option
      items = [
        {
          name: app.homey.__('capability.shelly_illumination._name'),
          id: 0,
        },
      ];
    }

    return items.filter(component => component.name.toLowerCase().includes(query.toLowerCase()));
  };

  app.homey.flow
    .getDeviceTriggerCard('shelly_illumination_changed')
    .registerArgumentAutocompleteListener('illuminance', autoCompleteListener)
    .registerRunListener(
      (
        flowArgs: {
          value: Array<ShellyIlluminanceType>;
          device: Homey.Device;
          illuminance: { name: string; id: number };
        },
        triggerArgs: { value: ShellyIlluminanceType; illuminance: number },
      ) => {
        if (flowArgs.device instanceof ShellyLocalDevice && flowArgs.illuminance.id !== triggerArgs.illuminance) {
          return false;
        }

        return flowArgs.value.includes(triggerArgs.value);
      },
    );

  app.homey.flow
    .getConditionCard('shelly_illumination_is')
    .registerArgumentAutocompleteListener('illuminance', autoCompleteListener)
    .registerRunListener(
      (
        flowArgs: {
          value: Array<ShellyIlluminanceType>;
          device: Homey.Device;
          illuminance: { name: string; id: number };
        },
        _triggerArgs: { manual: boolean },
      ) => {
        if (flowArgs.device instanceof ShellyLocalDevice) {
          const componentKey = `${Illuminance.key}:${flowArgs.illuminance.id}`;
          const component = flowArgs.device.virtualComponents.get(componentKey) as Illuminance | undefined;
          if (component === undefined) {
            throw new Error(app.homey.__('error.component_not_found', { component: componentKey }));
          }
          return flowArgs.value.includes(component.status.illumination!);
        }

        // Non-local device should check capability value
        return flowArgs.value.includes(flowArgs.device.getCapabilityValue('shelly_illumination'));
      },
    );
}
