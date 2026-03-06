import ShellyLocalDriver from '../../lib/Driver.mjs';
import type { ShellyLocalListDeviceProperties } from '../../lib/types.mjs';
import type { ShellyGetComponentsResponseComponent } from '../../lib/component/components/Shelly/GetComponents.mjs';
import Switch from '../../lib/component/components/Switch.mjs';
import type { ShellyGetDeviceInfoResponse } from '../../lib/component/components/Shelly/GetDeviceInfo.mjs';

export default class Shelly1Gen4Driver extends ShellyLocalDriver {
  async onPairMatchDevice(deviceInfo: ShellyGetDeviceInfoResponse): Promise<boolean> {
    return deviceInfo.id.toLowerCase().startsWith('shelly1g4');
  }

  async assembleHomeyDevices(
    selectedDevice: ShellyLocalListDeviceProperties,
    components: ShellyGetComponentsResponseComponent[],
  ): Promise<ShellyLocalListDeviceProperties[]> {
    const device: ShellyLocalListDeviceProperties = {
      name: selectedDevice.name,
      data: {
        id: selectedDevice.data.id,
      },
      icon: '../../../assets/drivers/shelly1g4/icon.svg',
      store: {
        ...selectedDevice.store,
        components: components.map(component => component.key),
      },
    };

    return [device];
  }
}
