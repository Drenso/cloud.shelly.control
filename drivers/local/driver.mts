import Homey, { type DiscoveryResultMDNSSD, type Driver } from 'homey';
import type { ShellyLocalDeviceStore } from './device.mjs';

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

type ShellyLocalListDeviceProperties = ListDeviceProperties & { store: ShellyLocalDeviceStore };

export default class ShellyLocalDriver extends Homey.Driver {
  async onInit(): Promise<void> {
    this.log('PlaceholderDriver has been initialized.');
  }

  async assembleSubdevices(selectedDevices: ShellyLocalListDeviceProperties[]): Promise<unknown[]> {
    this.log('TODO');
    return selectedDevices;
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
