import Homey, { type DiscoveryResultMDNSSD, type Driver } from 'homey';
import type { ShellyLocalDeviceStore } from './device.mjs';
import HttpChannel from '../../lib/rpc/channel/HttpChannel.mjs';
import type { ShellyGetComponentsResponseComponent } from '../../lib/component/components/Shelly/GetComponents.mjs';
import Shelly from '../../lib/component/components/Shelly.mjs';
import { ComponentMapping, type MappedComponent } from '../../lib/component/ComponentMapping.mjs';

type ListDeviceProperties = {
  name: string;
  data: {
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  store?: {
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  settings?: {
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  icon?: string;
  capabilities?: string[];
  capabilitiesOptions?: {
    [key: string]: {
      [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
  };
  class?: string;
};

export type ShellyLocalListDeviceProperties = ListDeviceProperties & { store: ShellyLocalDeviceStore };

export default class ShellyLocalDriver extends Homey.Driver {
  async onInit(): Promise<void> {
    this.log('PlaceholderDriver has been initialized.');
  }

  async assembleSubdevices(selectedDevices: ShellyLocalListDeviceProperties[]): Promise<unknown[]> {
    const subdevices: ShellyLocalListDeviceProperties[] = [];
    for (const selectedDevice of selectedDevices) {
      const newSubdevices = await this.assembleDevice(selectedDevice);
      subdevices.push(...newSubdevices);
    }
    return subdevices;
  }

  async assembleDevice(selectedDevice: ShellyLocalListDeviceProperties): Promise<ShellyLocalListDeviceProperties[]> {
    const mainDevice: ShellyLocalListDeviceProperties = {
      name: selectedDevice.name,
      data: {
        id: selectedDevice.data.id,
        parent: selectedDevice.data.id,
      },
      store: {
        ...selectedDevice.store,
        components: [],
      },
    };
    let devices = new Map<string, ShellyLocalListDeviceProperties>([[selectedDevice.data.id, mainDevice]]);
    const httpChannel = new HttpChannel(selectedDevice.store.address);

    const components: ShellyGetComponentsResponseComponent[] = [];
    while (true) {
      const componentsResponse = await Shelly.GetComponents(httpChannel, { offset: components.length });
      components.push(...componentsResponse.result.components);
      if (components.length >= componentsResponse.result.total) {
        break;
      }
    }

    for (const component of components) {
      const [componentName] = component.key.split(':') as [string, `${number}` | undefined];
      // @ts-expect-error TS definition is incorrect with behavior in practice
      const componentConstructor: MappedComponent | undefined = ComponentMapping[componentName];
      if (!componentConstructor) {
        this.log('No implementation found for', componentName);
        continue;
      }
      devices = componentConstructor.createDevices(selectedDevice.data.id, component, devices);
    }

    return [...devices.values()];
  }

  async onPair(session: Driver.PairSession): Promise<void> {
    let selectedDevices: ShellyLocalListDeviceProperties[] = [];
    let subDevices: unknown[] = [];
    await super.onPair(session);
    session.setHandler('list_devices_selection', async (data: ShellyLocalListDeviceProperties[]) => {
      selectedDevices = data;
    });
    session.setHandler('showView', async (view: string) => {
      if (view === 'load_subdevices') {
        subDevices = await this.assembleSubdevices(selectedDevices);
        await session.showView('add_subdevices');
      }
    });
    session.setHandler('add_subdevices', async () => {
      return subDevices;
    });
  }

  async onPairListDevices(): Promise<ShellyLocalListDeviceProperties[]> {
    const results: ShellyLocalListDeviceProperties[] = [];

    const discoveryStrategy = this.homey.discovery.getStrategy('shelly');
    const discoveryResults = discoveryStrategy.getDiscoveryResults();

    for (const discoveryResultsKey in discoveryResults) {
      const discoveryResult = discoveryResults[discoveryResultsKey] as DiscoveryResultMDNSSD;
      const txt = discoveryResult.txt as { ver: `${number}.${number}.${number}`; app: string; gen: `${number}` };
      results.push({
        name: txt.app,
        data: {
          id: discoveryResult.id,
        },
        store: {
          address: discoveryResult.address,
          port: discoveryResult.port as unknown as number,
          host: discoveryResult.host,
          name: discoveryResult.name,
          txt: txt,
          components: [],
        },
      });
    }

    return results;
  }
}
