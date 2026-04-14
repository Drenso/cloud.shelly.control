import ShellyLocalDriver from '../../lib/local/LocalDriver.mjs';
import type { ShellyLocalListDeviceProperties } from '../../lib/types.mjs';
import type { ShellyGetComponentsResponseComponent } from '../../lib/component/components/Shelly/GetComponents.mjs';
import Switch, { type SwitchConfig } from '../../lib/component/components/Switch.mjs';

export default class ShellyPowerStripGen4LocalDriver extends ShellyLocalDriver {
  public async assembleHomeyDevices(
    selectedDevice: ShellyLocalListDeviceProperties,
    components: ShellyGetComponentsResponseComponent[],
  ): Promise<ShellyLocalListDeviceProperties[]> {
    const componentMapping: Record<string, ShellyGetComponentsResponseComponent> = {};

    for (const component of components) {
      componentMapping[component.key] = component;
    }

    const splitComponents = ['switch'];

    const subDevices: ShellyLocalListDeviceProperties[] = [];
    const id = selectedDevice.data.id;
    // Create a sub-device for each switch
    for (const component of components) {
      const [componentType, componentId] = component.key.split(':') as [string, `${number}` | undefined];
      if (componentType === 'switch') {
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
            components: splitComponents.map(splitComponent => `${splitComponent}:${componentId}`),
          },
        });
      }
    }

    // Assign components that do not belong to a specific switch to all sub-devices
    for (const component of components) {
      const [componentType] = component.key.split(':') as [string, `${number}` | undefined];
      if (!splitComponents.includes(componentType)) {
        for (const subDevice of subDevices) {
          subDevice.store.components.push(component.key);
        }
      }
    }
    return subDevices;
  }
}
