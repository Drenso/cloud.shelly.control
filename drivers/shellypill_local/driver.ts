import ShellyLocalDriver from '../../lib/local/LocalDriver.js';
import type { ShellyGetComponentsResponseComponent } from '../../lib/component/components/Shelly/GetComponents.js';
import type { ShellyLocalListDeviceProperties, ShellyLocalListVirtualDeviceProperties } from '../../lib/types.js';
import type { InputConfig } from '../../lib/component/components/Input.js';
import type { SwitchConfig } from '../../lib/component/components/Switch.js';
import type { TemperatureConfig } from '../../lib/component/components/Temperature.js';
import { color } from '../../lib/util.js';
import { ComponentMapping } from '../../lib/component/ComponentMapping.js';

export default class ShellyPillLocalDriver extends ShellyLocalDriver {
  public async assembleHomeyDevices(
    selectedDevice: ShellyLocalListVirtualDeviceProperties,
    components: ShellyGetComponentsResponseComponent[],
  ): Promise<ShellyLocalListDeviceProperties[]> {
    const splitComponents = [
      'input',
      'voltmeter',
      'switch',
      'temperature',
      'humidity',
      /* 'Serial', 'MbRtuClient' */ // The config for these does not seem to be accessible
    ] as const;

    const id = selectedDevice.data.id;
    const homeyDevices: ShellyLocalListDeviceProperties[] = [];

    const sharedComponentKeys: string[] = [];

    for (const component of components) {
      const [componentType, componentId] = component.key.split(':') as [string, `${number}` | undefined];

      if (!splitComponents.includes(componentType as never)) {
        sharedComponentKeys.push(component.key);
        continue;
      }

      let subdeviceId = `${id}:${componentType}`;
      if (componentId !== undefined) {
        const deviceId = parseInt(componentId);
        subdeviceId = `${subdeviceId}:${deviceId}`;
      }

      const config = component.config as InputConfig | SwitchConfig | TemperatureConfig;
      const componentConstructor = ComponentMapping[componentType as Exclude<(typeof splitComponents)[number], 'pill'>];
      let subDeviceName = config.name ?? componentConstructor.uiName;
      if (componentId !== undefined) {
        subDeviceName = `${subDeviceName} ${componentId}`;
      }
      if (componentType === 'pill') {
        subDeviceName = selectedDevice.name;
      } else {
        subDeviceName = `${selectedDevice.name} - ${subDeviceName}`;
      }

      homeyDevices.push({
        name: subDeviceName,
        data: {
          id: subdeviceId,
          parent: selectedDevice.data.id,
        },
        icon: `../../../assets/drivers/${this.baseDriverId}/icon.svg`,
        store: {
          ...selectedDevice.store,
          components: [component.key],
        },
        capabilities: [],
      });
    }

    // Assign components that do not belong to a specific Homey device to all Homey devices
    for (const homeyDevice of homeyDevices) {
      homeyDevice.store.components = [...homeyDevice.store.components, ...sharedComponentKeys];
    }

    this.log(
      color.red(
        'Homey devices:',
        homeyDevices.map(device => device.data.id),
      ),
    );

    this.log(color.red('Shared components:', sharedComponentKeys));

    return homeyDevices;
  }
}
