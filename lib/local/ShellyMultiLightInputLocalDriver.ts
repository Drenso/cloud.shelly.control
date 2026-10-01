import type { ShellyGetComponentsResponseComponent } from '../component/components/Shelly/GetComponents.js';
import Light, { type LightConfig } from '../component/components/Light.js';
import type { ShellyLocalListVirtualDeviceProperties, ShellyLocalListDeviceProperties } from '../types.js';
import ShellyLocalDriver from './LocalDriver.js';

export default abstract class ShellyMultiLightInputLocalDriver extends ShellyLocalDriver {
  public async assembleHomeyDevices(
    selectedDevice: ShellyLocalListVirtualDeviceProperties,
    components: ShellyGetComponentsResponseComponent[],
  ): Promise<ShellyLocalListDeviceProperties[]> {
    const sharedComponents = components
      .filter(component => !component.key.startsWith('light:') && !component.key.startsWith('input:'))
      .map(component => component.key);
    const componentKeys = new Set(components.map(component => component.key));
    const homeyDevices: ShellyLocalListDeviceProperties[] = [];

    for (const component of components) {
      if (!component.key.startsWith('light:')) {
        continue;
      }
      const lightId = Number(component.key.split(':')[1]);
      const lightConfig = component.config as LightConfig;
      const inputIds = component.attrs?.inputs ?? [lightId * 2, lightId * 2 + 1];
      const inputKeys = inputIds
        .map(inputId => ('input:' + inputId) as ShellyGetComponentsResponseComponent['key'])
        .filter(inputKey => componentKeys.has(inputKey));

      homeyDevices.push({
        name: selectedDevice.name + ' - ' + (lightConfig.name || Light.uiName + ' ' + (lightId + 1)),
        data: {
          id: selectedDevice.data.id + ':light:' + lightId,
          parent: selectedDevice.data.id,
          subdevice_id: lightId,
        },
        icon: '../../../assets/drivers/' + this.baseDriverId + '/icon.svg',
        store: {
          ...selectedDevice.store,
          components: [component.key, ...inputKeys, ...sharedComponents],
        },
        capabilities: ['button.restart'],
      });
    }
    return homeyDevices;
  }
}
