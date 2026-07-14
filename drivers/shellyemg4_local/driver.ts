import ShellyLocalDriver from '../../lib/local/LocalDriver.js';
import type { ShellyLocalListDeviceProperties } from '../../lib/types.js';
import type { ShellyGetComponentsResponseComponent } from '../../lib/component/components/Shelly/GetComponents.js';
import EM1, { type EM1Config } from '../../lib/component/components/EM1.js';
import Switch, { type SwitchConfig } from '../../lib/component/components/Switch.js';

export default class ShellyEMGen4LocalDriver extends ShellyLocalDriver {
  public async assembleHomeyDevices(
    selectedDevice: ShellyLocalListDeviceProperties,
    components: ShellyGetComponentsResponseComponent[],
  ): Promise<ShellyLocalListDeviceProperties[]> {
    const componentMapping: Record<string, ShellyGetComponentsResponseComponent> = {};

    for (const component of components) {
      componentMapping[component.key] = component;
    }

    const splitComponents = ['em1', 'em1data'];

    const subDevices: ShellyLocalListDeviceProperties[] = [];
    const id = selectedDevice.data.id;
    // Create a sub-device for each electrical measurement and switch component and
    for (const component of components) {
      const [componentType, componentId] = component.key.split(':') as [string, `${number}` | undefined];
      if (componentType === 'em1') {
        const emId = parseInt(componentId!, 10);
        const subdeviceId = `${id}:em1:${emId}`;

        const em1Config = component.config as EM1Config;
        const subdeviceName = em1Config.name ?? `${EM1.uiName} ${emId + 1}`;

        subDevices.push({
          name: `${selectedDevice.name} - ${subdeviceName}`,
          data: {
            id: subdeviceId,
            parent: selectedDevice.data.id,
            subdevice_id: parseInt(componentId!, 10),
          },
          icon: `../../../assets/drivers/${this.baseDriverId}/icon.svg`,
          store: {
            ...selectedDevice.store,
            components: splitComponents.map(splitComponent => `${splitComponent}:${componentId}`),
          },
          capabilities: ['button.restart'],
        });
      } else if (componentType === 'switch') {
        const switchId = parseInt(componentId!, 10);
        const subdeviceId = `${id}:switch:${switchId}`;

        const switchConfig = component.config as SwitchConfig;
        const subdeviceName = switchConfig.name ?? `${Switch.uiName} ${switchId + 1}`;

        subDevices.push({
          name: `${selectedDevice.name} - ${subdeviceName}`,
          data: {
            id: subdeviceId,
            parent: selectedDevice.data.id,
            subdevice_id: parseInt(componentId!, 10),
          },
          icon: `../../../assets/drivers/${this.baseDriverId}/icon.svg`,
          store: {
            ...selectedDevice.store,
            components: [`switch:${componentId}`],
          },
          capabilities: ['button.restart'],
        });
      }
    }

    // Assign components that do not belong to a specific split device to all sub-devices
    for (const component of components) {
      const [componentType] = component.key.split(':') as [string, `${number}` | undefined];
      if (!splitComponents.includes(componentType) && componentType !== 'switch') {
        for (const subDevice of subDevices) {
          subDevice.store.components.push(component.key);
        }
      }
    }
    return subDevices;
  }
}
