import Homey, { type DiscoveryResultMDNSSD } from 'homey';
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
