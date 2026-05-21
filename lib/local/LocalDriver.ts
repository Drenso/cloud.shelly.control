import Homey from 'homey';
import { VirtualDevice } from '../VirtualDevice.js';
import type ShellyApp from '../../app.js';
import type {
  ShellyDiscoveryResult,
  ShellyLocalListDeviceProperties,
  ShellyLocalListVirtualDeviceProperties,
} from '../types.js';
import type { ShellyGetComponentsResponseComponent } from '../component/components/Shelly/GetComponents.js';
import Shelly from '../component/components/Shelly.js';
import type { ShellyGetDeviceInfoResponse } from '../component/components/Shelly/GetDeviceInfo.js';
import { createHttpChannel } from '../HomeyRPCChannels.js';
import { LocalPairingHandler } from './LocalPairingHandler.js';
import type ShellyLocalDevice from './LocalDevice.js';
import { LocalRePairingHandler } from './LocalRePairingHandler.js';

export default abstract class ShellyLocalDriver extends Homey.Driver {
  protected batteryDevice = false;

  public async onInit(): Promise<void> {
    await super.onInit();
    const readyResolver = this.app.localDriverResolvers[this.id];
    readyResolver();
    this.debug('ready');
  }

  public get app(): ShellyApp {
    return this.homey.app as ShellyApp;
  }

  public async onPair(session: Homey.Driver.PairSession): Promise<void> {
    await super.onPair(session);
    await new LocalPairingHandler(
      session,
      this,
      (...args: Array<unknown>) => this.log('[Pairing Handler]', ...args),
      (...args: Array<unknown>) => this.error('[Pairing Handler]', ...args),
      (...args: Array<unknown>) => this.debug('[Pairing Handler]', ...args),
    ).setup();
  }

  public async onRepair(session: Homey.Driver.PairSession, device: ShellyLocalDevice): Promise<void> {
    await new LocalRePairingHandler(
      session,
      device,
      this,
      (...args: Array<unknown>) => this.log('[Re-Pairing Handler]', ...args),
      (...args: Array<unknown>) => this.error('[Re-Pairing Handler]', ...args),
      (...args: Array<unknown>) => this.debug('[Re-Pairing Handler]', ...args),
    ).setup();
  }

  public splitComponents(components: ShellyGetComponentsResponseComponent[]): {
    addonComponents: ShellyGetComponentsResponseComponent[];
    mainComponents: ShellyGetComponentsResponseComponent[];
  } {
    const addonComponents: ShellyGetComponentsResponseComponent[] = [];
    const mainComponents: ShellyGetComponentsResponseComponent[] = [];

    for (const component of components) {
      const [, componentId] = component.key.split(':') as [string, `${number}` | undefined];
      if (componentId !== undefined) {
        const componentIdNumber = parseInt(componentId);
        if (100 <= componentIdNumber && componentIdNumber <= 199) {
          addonComponents.push(component);
          continue;
        }
      }
      mainComponents.push(component);
    }
    return { addonComponents, mainComponents };
  }

  public async createVirtualDevice(
    selectedDevice: ShellyLocalListVirtualDeviceProperties,
    components: ShellyGetComponentsResponseComponent[],
    homeyDevices: ShellyLocalListDeviceProperties[],
  ): Promise<VirtualDevice> {
    const homeyDeviceIds = homeyDevices.map(homeyDevice => homeyDevice.data.id);
    const componentKeys = components.map(component => component.key);
    return new VirtualDevice(
      this.app,
      selectedDevice.data.id,
      selectedDevice.store.address,
      this.batteryDevice,
      componentKeys,
      this.id,
      homeyDeviceIds,
      selectedDevice.data.useHttps,
      selectedDevice.store.ha1,
      components,
      homeyDevices,
    );
  }

  public getDefaultName(): string {
    return this.manifest.name.en.split('-')[0].trim();
  }

  protected get baseDriverId(): string {
    return this.id.split('_')[0];
  }

  protected async onPairMatchDevice(deviceInfo: ShellyGetDeviceInfoResponse): Promise<boolean> {
    return deviceInfo.id.toLowerCase().startsWith(this.baseDriverId);
  }

  public async assembleAddonHomeyDevices(
    selectedDevice: ShellyLocalListVirtualDeviceProperties,
    components: ShellyGetComponentsResponseComponent[],
  ): Promise<ShellyLocalListDeviceProperties[]> {
    const device: ShellyLocalListDeviceProperties = {
      name: `${selectedDevice.name} - Addon`,
      data: {
        id: `${selectedDevice.data.id}:addon`,
        parent: selectedDevice.data.id,
      },
      icon: `../../../assets/drivers/${this.baseDriverId}/icon.svg`,
      store: {
        ...selectedDevice.store,
        components: components.map(component => component.key),
      },
      capabilities: [],
    };

    return [device];
  }

  public async assembleHomeyDevices(
    selectedDevice: ShellyLocalListVirtualDeviceProperties,
    components: ShellyGetComponentsResponseComponent[],
  ): Promise<ShellyLocalListDeviceProperties[]> {
    const device: ShellyLocalListDeviceProperties = {
      name: selectedDevice.name,
      data: {
        id: selectedDevice.data.id,
      },
      icon: `../../../assets/drivers/${this.baseDriverId}/icon.svg`,
      store: {
        ...selectedDevice.store,
        components: components.map(component => component.key),
      },
      capabilities: [],
    };

    return [device];
  }

  public async onPairListDevices(): Promise<ShellyLocalListVirtualDeviceProperties[]> {
    const results: Promise<ShellyLocalListVirtualDeviceProperties | undefined>[] = [];

    const discoveryStrategy = this.homey.discovery.getStrategy('shelly');
    const discoveryResults = discoveryStrategy.getDiscoveryResults();

    for (const key in discoveryResults) {
      const discoveryResult = discoveryResults[key] as ShellyDiscoveryResult;
      results.push(this.getPairDevice(discoveryResult));
    }
    return Promise.all(results).then(results => results.filter(result => result !== undefined));
  }

  private async getPairDevice(
    discoveryResult: ShellyDiscoveryResult,
  ): Promise<ShellyLocalListVirtualDeviceProperties | undefined> {
    try {
      const httpChannel = createHttpChannel(discoveryResult.address, this.homey.__, false);
      const deviceInfoResponse = await Shelly.GetDeviceInfo(httpChannel);
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
          useHttps: httpChannel.useHttps,
        },
        store: {
          address: discoveryResult.address,
          port: Number(discoveryResult.port),
          components: [],
          auth_domain: deviceInfo.auth_domain ?? undefined,
        },
      };
    } catch (error) {
      this.error(error);
      return undefined;
    }
  }

  public debug(...args: unknown[]): void {
    if (Homey.env['DEBUG'] !== '1') {
      return;
    }

    console.log(new Date(), '[dbg]', '[ManagerDrivers]', `[Driver:${this.id}]`, ...args);
  }
}
