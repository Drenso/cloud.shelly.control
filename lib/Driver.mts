import Homey from 'homey';
import { VirtualDevice } from './VirtualDevice.mjs';
import type ShellyApp from '../app.mjs';
import type { ShellyDiscoveryResult, ShellyLocalListDeviceProperties } from './types.mjs';
import HttpChannel from './rpc/channel/HttpChannel.mjs';
import type { ShellyGetComponentsResponseComponent } from './component/components/Shelly/GetComponents.mjs';
import Shelly from './component/components/Shelly.mjs';

export default class ShellyLocalDriver extends Homey.Driver {
  get app(): ShellyApp {
    return this.homey.app as ShellyApp;
  }

  async onPair(session: Homey.Driver.PairSession): Promise<void> {
    let selectedDevices: ShellyLocalListDeviceProperties[] = [];
    let subDevices: unknown[] = [];
    await super.onPair(session);
    session.setHandler('list_devices_selection', async (data: ShellyLocalListDeviceProperties[]) => {
      selectedDevices = data;
    });
    session.setHandler('showView', async (view: string) => {
      if (view === 'load_subdevices') {
        subDevices = await this.createDevices(selectedDevices);
        await session.showView('add_subdevices');
      }
    });
    session.setHandler('add_subdevices', async () => {
      return subDevices;
    });
  }

  private async createDevices(
    selectedDevices: ShellyLocalListDeviceProperties[],
  ): Promise<ShellyLocalListDeviceProperties[]> {
    const devices: ShellyLocalListDeviceProperties[] = [];
    for (const selectedDevice of selectedDevices) {
      const components = await this.getDeviceComponents(selectedDevice.store.address);
      const homeyDevices = await this.assembleHomeyDevices(selectedDevice, components);
      const virtualDevice = await this.createVirtualDevice(selectedDevice, components, homeyDevices);
      await this.app.addVirtualDevice(virtualDevice);
      devices.push(...homeyDevices);
    }
    return devices;
  }

  private async createVirtualDevice(
    selectedDevice: ShellyLocalListDeviceProperties,
    components: ShellyGetComponentsResponseComponent[],
    homeyDevices: ShellyLocalListDeviceProperties[],
  ): Promise<VirtualDevice> {
    const homeyDeviceIds = homeyDevices.map(homeyDevice => homeyDevice.data.id);
    const componentKeys = components.map(component => component.key);
    return new VirtualDevice(
      this.app,
      selectedDevice.data.id,
      selectedDevice.store.address,
      componentKeys,
      homeyDeviceIds,
      components,
    );
  }

  async assembleHomeyDevices(
    selectedDevice: ShellyLocalListDeviceProperties,
    components: ShellyGetComponentsResponseComponent[],
  ): Promise<ShellyLocalListDeviceProperties[]> {
    return [selectedDevice];
  }

  async onPairMatchDevice(discoveryResult: ShellyDiscoveryResult): Promise<boolean> {
    return true;
  }

  async onPairListDevices(): Promise<ShellyLocalListDeviceProperties[]> {
    const results: ShellyLocalListDeviceProperties[] = [];

    const discoveryStrategy = this.homey.discovery.getStrategy('shelly');
    const discoveryResults = discoveryStrategy.getDiscoveryResults();

    for (const discoveryResultsKey in discoveryResults) {
      const discoveryResult = discoveryResults[discoveryResultsKey] as ShellyDiscoveryResult;
      if (!(await this.onPairMatchDevice(discoveryResult))) {
        continue;
      }
      const txt = discoveryResult.txt;
      results.push({
        name: txt.app,
        data: {
          id: discoveryResult.id,
          parent: discoveryResult.id,
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

  private async getDeviceComponents(ipAddress: string): Promise<ShellyGetComponentsResponseComponent[]> {
    const httpChannel = new HttpChannel(ipAddress);
    const components: ShellyGetComponentsResponseComponent[] = [];
    while (true) {
      const componentsResponse = await Shelly.GetComponents(httpChannel, { offset: components.length });
      components.push(...componentsResponse.result.components);
      if (components.length >= componentsResponse.result.total) {
        break;
      }
    }
    return components;
  }
}
