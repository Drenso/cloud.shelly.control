import Homey from 'homey';

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
    return [
      {
        name: 'Placeholder',
        data: {
          id: 'placeholder',
        },
      },
    ];
  }
}
