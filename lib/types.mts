import type { DiscoveryResultMDNSSD } from 'homey';

export type ShellyLocalDeviceStore = {
  address: string;
  port: number;
  host: string;
  name: string;
  txt: { ver: `${number}.${number}.${number}`; app: string; gen: `${number}` };
  components: string[];
};

export type ShellyLocalDeviceData = {
  id: string;
  parent: string;
};

export type ListDeviceProperties = {
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

export type ShellyDiscoveryResult = DiscoveryResultMDNSSD & {
  txt: { ver: `${number}.${number}.${number}`; app: string; gen: `${number}` };
};

export type ShellyLocalListDeviceProperties = ListDeviceProperties & {
  store: ShellyLocalDeviceStore;
  data: ShellyLocalDeviceData;
};
