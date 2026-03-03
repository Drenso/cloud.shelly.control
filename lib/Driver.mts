import Homey from 'homey';
import { VirtualDevice } from './VirtualDevice.mjs';
import type ShellyApp from '../app.mjs';
import type { ShellyDiscoveryResult, ShellyLocalListDeviceProperties } from './types.mjs';
import HttpChannel from './rpc/channel/HttpChannel.mjs';
import type { ShellyGetComponentsResponseComponent } from './component/components/Shelly/GetComponents.mjs';
import Shelly from './component/components/Shelly.mjs';

export default abstract class ShellyLocalDriver extends Homey.Driver {
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
        await session.showView('add_subdevices').catch(this.error);
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
      const components = await Shelly.getAllComponents(new HttpChannel(selectedDevice.store.address));
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

  abstract assembleHomeyDevices(
    selectedDevice: ShellyLocalListDeviceProperties,
    components: ShellyGetComponentsResponseComponent[],
  ): Promise<ShellyLocalListDeviceProperties[]>;

  abstract onPairMatchDevice(discoveryResult: ShellyDiscoveryResult): Promise<boolean>;

  async onPairListDevices(): Promise<ShellyLocalListDeviceProperties[]> {
    const results: ShellyLocalListDeviceProperties[] = [];

    const discoveryStrategy = this.homey.discovery.getStrategy('shelly');
    const discoveryResults = discoveryStrategy.getDiscoveryResults();

    this.log(JSON.stringify(discoveryResults));

    for (const discoveryResultsKey in discoveryResults) {
      const discoveryResult = discoveryResults[discoveryResultsKey] as ShellyDiscoveryResult;
      if (!(await this.onPairMatchDevice(discoveryResult))) {
        continue;
      }
      const txt = discoveryResult.txt;
      results.push({
        name: discoveryResult.name,
        data: {
          id: discoveryResult.id,
        },
        store: {
          address: discoveryResult.address,
          port: Number(discoveryResult.port),
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
