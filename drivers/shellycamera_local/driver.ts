import type { ShellyGetComponentsResponseComponent } from '../../lib/component/components/Shelly/GetComponents.js';
import Storage, { type StorageConfig } from '../../lib/component/components/Storage.js';
import ShellyLocalDriver from '../../lib/local/LocalDriver.js';
import type { ShellyLocalListDeviceProperties, ShellyLocalListVirtualDeviceProperties } from '../../lib/types.js';

export default class ShellyCameraLocalDriver extends ShellyLocalDriver {
  public async assembleHomeyDevices(
    selectedDevice: ShellyLocalListVirtualDeviceProperties,
    components: ShellyGetComponentsResponseComponent[],
  ): Promise<ShellyLocalListDeviceProperties[]> {
    const splitComponents = ['storage'];
    const id = selectedDevice.data.id;

    const subDevices: ShellyLocalListDeviceProperties[] = [
      {
        name: selectedDevice.name,
        data: { id },
        icon: `../../../assets/drivers/${this.baseDriverId}/icon.svg`,
        store: {
          ...selectedDevice.store,
          components: components
            .filter(component => !splitComponents.includes(component.key.split(':')[0]))
            .map(component => component.key),
        },
        capabilities: [],
      },
    ];

    for (const component of components) {
      const [componentType, componentId] = component.key.split(':') as [string, `${number}` | undefined];

      // Create a sub-device for each storage
      if (componentType === 'storage') {
        const storageId = parseInt(componentId!, 10);
        const subdeviceId = `${id}:storage:${storageId}`;

        const storageConfig = component.config as StorageConfig;
        const subdeviceName = storageConfig.name ?? `${Storage.uiName} ${storageId + 1}`;

        subDevices.push({
          name: `${selectedDevice.name} - ${subdeviceName}`,
          data: {
            id: subdeviceId,
            parent: selectedDevice.data.id,
            subdevice_id: parseInt(componentId!, 10),
          },
          icon: `../../../assets/drivers/${this.baseDriverId}/icon_storage.svg`,
          store: {
            ...selectedDevice.store,
            components: splitComponents.map(splitComponent => `${splitComponent}:${componentId}`),
          },
          capabilities: [],
        });
      }
    }

    return subDevices;
  }
}
