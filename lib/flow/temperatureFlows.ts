import type ShellyApp from '../../app.js';
import Cover from '../component/components/Cover.js';
import Light from '../component/components/Light.js';
import Switch from '../component/components/Switch.js';
import Temperature from '../component/components/Temperature.js';
import type ShellyLocalDevice from '../local/LocalDevice.js';

export function registerTemperatureFlowCards(app: ShellyApp): void {
  const getTemperatureComponents = (device: ShellyLocalDevice): (Temperature | Switch | Light | Cover)[] => {
    if (device.virtualDevice === undefined) {
      return [];
    }

    return [...device.virtualComponents.values()].filter(component => {
      if (component instanceof Temperature) {
        return true;
      }
      if (component instanceof Switch || component instanceof Light || component instanceof Cover) {
        return component.status.temperature !== undefined;
      }
      return false;
    }) as (Temperature | Switch | Light | Cover)[];
  };

  app.homey.flow
    .getDeviceTriggerCard('measure_temperature_changed')
    .registerArgumentAutocompleteListener(
      'component',
      (query: string, { device }: { device: ShellyLocalDevice }): { name: string; id: string }[] => {
        return getTemperatureComponents(device)
          .map(component => ({
            name: component.getAutocompleteTitle(device, 'measure_temperature'),
            id: component.getComponentKey(),
          }))
          .filter(component => component.name.toLowerCase().includes(query.toLowerCase()));
      },
    )
    .registerRunListener((flowArgs: { component?: { id: string } }, triggerArgs: { component: string }) => {
      return flowArgs.component === undefined || flowArgs.component.id === triggerArgs.component;
    });
}
