import Homey from 'homey';
import { VirtualDevice } from './VirtualDevice.mjs';
import type ShellyApp from '../app.mjs';
import type { ShellyDiscoveryResult, ShellyLocalListDeviceProperties } from './types.mjs';
import HttpChannel from './rpc/channel/HttpChannel.mjs';
import type { ShellyGetComponentsResponseComponent } from './component/components/Shelly/GetComponents.mjs';
import Shelly from './component/components/Shelly.mjs';
import type { ShellyGetDeviceInfoResponse } from './component/components/Shelly/GetDeviceInfo.mjs';

export default abstract class ShellyLocalDriver extends Homey.Driver {
  get app(): ShellyApp {
    return this.homey.app as ShellyApp;
  }

  async onPair(session: Homey.Driver.PairSession): Promise<void> {
    let selectedDevices: ShellyLocalListDeviceProperties[] = [];
    const deviceComponents = new Map<string, ShellyGetComponentsResponseComponent[]>();
    const childHomeyDevices = new Map<string, ShellyLocalListDeviceProperties[]>();
    const allHomeyDevices: ShellyLocalListDeviceProperties[] = [];
    await super.onPair(session);
    session.setHandler('list_devices_selection', async (data: ShellyLocalListDeviceProperties[]) => {
      selectedDevices = data;
    });
    session.setHandler('showView', async (view: string) => {
      if (view === 'load_subdevices') {
        for (const selectedDevice of selectedDevices) {
          // TODO add password
          const components = await Shelly.getAllComponents(new HttpChannel(selectedDevice.store.address));
          const homeyDevices = await this.assembleHomeyDevices(selectedDevice, components);
          allHomeyDevices.push(...homeyDevices);
          deviceComponents.set(selectedDevice.data.id, components);
          childHomeyDevices.set(selectedDevice.data.id, homeyDevices);
        }
        await session.showView('add_subdevices').catch(this.error);
      }
    });
    session.setHandler('add_subdevices', async () => {
      return allHomeyDevices;
    });
    session.setHandler('done', async () => {
      this.log('Added subdevices, registering virtual device...');
      for (const selectedDevice of selectedDevices) {
        const components = deviceComponents.get(selectedDevice.data.id)!;
        const homeyDevices = childHomeyDevices.get(selectedDevice.data.id)!;
        const virtualDevice = await this.createVirtualDevice(selectedDevice, components, homeyDevices);
        await this.app.addVirtualDevice(virtualDevice);
      }
    });
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

  abstract onPairMatchDevice(deviceInfo: ShellyGetDeviceInfoResponse): Promise<boolean>;

  getDefaultName(): string {
    return this.manifest.name.en.split('-')[0].trim();
  }

  async onPairListDevices(): Promise<ShellyLocalListDeviceProperties[]> {
    const results: Promise<ShellyLocalListDeviceProperties | undefined>[] = [];

    const discoveryStrategy = this.homey.discovery.getStrategy('shelly');
    const discoveryResults = discoveryStrategy.getDiscoveryResults();

    for (const key in discoveryResults) {
      const discoveryResult = discoveryResults[key] as ShellyDiscoveryResult;
      results.push(this.getPairDevice(discoveryResult));
    }
    return Promise.all(results).then(results => results.filter(result => result !== undefined));
  }

  async getPairDevice(discoveryResult: ShellyDiscoveryResult): Promise<ShellyLocalListDeviceProperties | undefined> {
    const deviceInfoResponse = await Shelly.GetDeviceInfo(new HttpChannel(discoveryResult.address));
    const deviceInfo = deviceInfoResponse.result;

    // Filter out devices that are already paired
    if (this.app.virtualDevices.has(deviceInfo.id)) {
      return undefined;
    }

    // Filter out devices that are not for this driver
    if (!(await this.onPairMatchDevice(deviceInfo))) {
      return undefined;
    }

    return {
      name: deviceInfo.name ?? this.getDefaultName(),
      data: {
        id: deviceInfo.id,
      },
      store: {
        address: discoveryResult.address,
        port: Number(discoveryResult.port),
        components: [],
      },
    };
  }
}
