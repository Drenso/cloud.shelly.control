import type { DiscoveryResultMDNSSD } from 'homey';

export type ShellyLocalDeviceStore = {
  address: string;
  port: number;
  components: string[];
  auth_domain?: string;
  ha1?: string;
};

export type ShellyLocalDeviceData = {
  id: string;
  parent?: string;
  subdevice_id?: number;
  battery_device?: boolean;
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
