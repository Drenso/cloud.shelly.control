import ShellyLocalDriver from '../../lib/Driver.mjs';
import type { ShellyLocalListDeviceProperties } from '../../lib/types.mjs';
import type { ShellyGetComponentsResponseComponent } from '../../lib/component/components/Shelly/GetComponents.mjs';
import Switch from '../../lib/component/components/Switch.mjs';
import type { ShellyGetDeviceInfoResponse } from '../../lib/component/components/Shelly/GetDeviceInfo.mjs';

export default class ShellyGen4PowerStripDriver extends ShellyLocalDriver {
  async onPairMatchDevice(deviceInfo: ShellyGetDeviceInfoResponse): Promise<boolean> {
    return deviceInfo.id.toLowerCase().startsWith('shellypstripg4');
  }

  async assembleHomeyDevices(
    selectedDevice: ShellyLocalListDeviceProperties,
    components: ShellyGetComponentsResponseComponent[],
  ): Promise<ShellyLocalListDeviceProperties[]> {
    const subDevices: ShellyLocalListDeviceProperties[] = [];
    const id = selectedDevice.data.id;
    // Create a sub-device for each switch
    for (const component of components) {
      const [componentType, componentId] = component.key.split(':') as [string, `${number}` | undefined];
      if (componentType === 'switch') {
        const switchId = parseInt(componentId!, 10);
        const subdeviceId = `${id}:switch:${switchId}`;
        subDevices.push({
          name: `${selectedDevice.name} - ${Switch.uiName} ${switchId + 1}`,
          data: {
            id: subdeviceId,
            parent: selectedDevice.data.id,
            subdevice_id: parseInt(componentId!, 10),
          },
          icon: '../../../assets/drivers/shellypstripg4/icon.svg',
          store: {
            ...selectedDevice.store,
            components: [component.key],
          },
        });
      }
    }

    // Assign components that do not belong to a specific switch to all sub-devices
    for (const component of components) {
      const [componentType] = component.key.split(':') as [string, `${number}` | undefined];
      if (componentType !== 'switch') {
        for (const subDevice of subDevices) {
          subDevice.store.components.push(component.key);
        }
      }
    }
    return subDevices;
  }
}
