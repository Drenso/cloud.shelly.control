import ShellyLocalDriver from '../../lib/local/LocalDriver.js';
import type { ShellyLocalListDeviceProperties, ShellyLocalListVirtualDeviceProperties } from '../../lib/types.js';
import type { ShellyGetComponentsResponseComponent } from '../../lib/component/components/Shelly/GetComponents.js';
import type { BooleanConfig } from '../../lib/component/components/Boolean.js';

export default class IrrigationControllerLocalDriver extends ShellyLocalDriver {
  public async assembleHomeyDevices(
    selectedDevice: ShellyLocalListVirtualDeviceProperties,
    components: ShellyGetComponentsResponseComponent[],
  ): Promise<ShellyLocalListDeviceProperties[]> {
    const subDevices: ShellyLocalListDeviceProperties[] = [];
    const id = selectedDevice.data.id;

    const sharedComponents: string[] = [];

    // Create a sub-device for each channel
    for (const component of components) {
      const [, componentId] = component.key.split(':') as [string, `${number}` | undefined];
      const role = component.attrs?.role;

      if (role?.startsWith('zone') && role !== 'zones_status') {
        const zoneId = parseInt(role.substring('zone'.length), 10);
        const booleanConfig = component.config as BooleanConfig;
        const subdeviceName = booleanConfig.name ?? `Zone ${zoneId + 1}`;
        const subdeviceId = `${id}:${component.key}`;

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
            components: [component.key],
          },
          capabilities: ['button.restart'],
        });
        continue;
      }

      sharedComponents.push(component.key);
    }

    for (const device of subDevices) {
      device.store.components = [...device.store.components, ...sharedComponents];
    }

    return subDevices;
  }
}
