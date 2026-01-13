import Homey, { type DiscoveryResultMDNSSD } from 'homey';

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

export default class PlaceholderDriver extends Homey.Driver {
  async onInit(): Promise<void> {
    this.log('PlaceholderDriver has been initialized.');
  }

  async onPairListDevices(): Promise<ListDeviceProperties[]> {
    const results: ListDeviceProperties[] = [];

    const discoveryStrategy = this.homey.discovery.getStrategy('shelly');
    const discoveryResults = discoveryStrategy.getDiscoveryResults();

    for (const discoveryResultsKey in discoveryResults) {
      const discoveryResult = discoveryResults[discoveryResultsKey] as DiscoveryResultMDNSSD;
      results.push({
        name: discoveryResult.name,
        data: {
          id: discoveryResult.id,
        },
        store: {
          address: discoveryResult.address,
          port: discoveryResult.port,
          host: discoveryResult.host,
          name: discoveryResult.name,
          txt: discoveryResult.txt,
        },
      });
    }

    return results;
  }
}
