import Homey from 'homey';
import { VirtualDevice } from '../VirtualDevice.mjs';
import type ShellyApp from '../../app.mjs';
import type { ShellyDiscoveryResult, ShellyLocalListDeviceProperties } from '../types.mjs';
import { HttpError } from '../rpc/channel/HttpChannel.mjs';
import type { ShellyGetComponentsResponseComponent } from '../component/components/Shelly/GetComponents.mjs';
import Shelly from '../component/components/Shelly.mjs';
import type { ShellyGetDeviceInfoResponse } from '../component/components/Shelly/GetDeviceInfo.mjs';
import { createHttpChannel } from '../HomeyRPCChannels.mjs';

export default abstract class ShellyLocalDriver extends Homey.Driver {
  public get app(): ShellyApp {
    return this.homey.app as ShellyApp;
  }

  // TODO refactor
  public async onPair(session: Homey.Driver.PairSession): Promise<void> {
    let selectedDevices: ShellyLocalListDeviceProperties[] = [];
    const deviceComponents = new Map<string, ShellyGetComponentsResponseComponent[]>();
    const childHomeyDevices = new Map<string, ShellyLocalListDeviceProperties[]>();
    const allHomeyDevices: ShellyLocalListDeviceProperties[] = [];
    let authenticationDevice: ShellyLocalListDeviceProperties;
    let resolveAuthentication: ((password: string) => void) | undefined;
    let rejectAuthentication: ((reason?: unknown) => void) | undefined;
    let authenticationPromise: Promise<string>;

    await super.onPair(session);
    session.setHandler('list_devices_selection', async (data: ShellyLocalListDeviceProperties[]) => {
      selectedDevices = data;
    });
    session.setHandler('showView', async (view: string) => {
      if (view !== 'authenticate_devices') {
        return;
      }

      for (authenticationDevice of selectedDevices) {
        if (authenticationDevice.store.auth_domain !== undefined) {
          authenticationPromise = new Promise((resolve, reject) => {
            resolveAuthentication = resolve;
            rejectAuthentication = reject;
          });
          await session.showView('device_password').catch(this.error);
          await session
            .emit('credentials_device', {
              title: authenticationDevice.name,
              id: authenticationDevice.data.id,
            })
            .catch(this.error);
          authenticationDevice.store.ha1 = await authenticationPromise;
        } else {
          const components = await Shelly.getAllComponents(createHttpChannel(authenticationDevice.store.address));
          const { addonComponents, mainComponents } = this.splitComponents(components);

          const homeyDevices = await this.assembleHomeyDevices(authenticationDevice, mainComponents);

          if (addonComponents.length > 0) {
            const addonDevice = await this.assembleAddonHomeyDevices(authenticationDevice, addonComponents);
            homeyDevices.push(...addonDevice);
          }

          allHomeyDevices.push(...homeyDevices);
          deviceComponents.set(authenticationDevice.data.id, components);
          childHomeyDevices.set(authenticationDevice.data.id, homeyDevices);
        }
      }
      await session.showView('add_subdevices').catch(this.error);
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
    session.setHandler('disconnect', async () => {
      rejectAuthentication?.('session disconnected');
    });
    session.setHandler('credentials', async (ha1: string) => {
      if (resolveAuthentication === undefined) {
        throw new Error('No device being authenticated');
      }
      try {
        const components = await Shelly.getAllComponents(createHttpChannel(authenticationDevice.store.address, ha1));
        const homeyDevices = await this.assembleHomeyDevices(authenticationDevice, components);
        allHomeyDevices.push(...homeyDevices);
        deviceComponents.set(authenticationDevice.data.id, components);
        childHomeyDevices.set(authenticationDevice.data.id, homeyDevices);
        resolveAuthentication(ha1);
        return true;
      } catch (err) {
        if (err instanceof HttpError && err.code === 401) {
          return false;
        } else {
          throw err;
        }
      }
    });
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
      this.id,
      homeyDeviceIds,
      selectedDevice.store.ha1,
      components,
    );
  }

  protected getDefaultName(): string {
    return this.manifest.name.en.split('-')[0].trim();
  }

  protected get baseDriverId(): string {
    return this.id.split('_')[0];
  }

  protected async onPairMatchDevice(deviceInfo: ShellyGetDeviceInfoResponse): Promise<boolean> {
    return deviceInfo.id.toLowerCase().startsWith(this.baseDriverId);
  }

  public async assembleAddonHomeyDevices(
    selectedDevice: ShellyLocalListDeviceProperties,
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
    };

    return [device];
  }

  public async assembleHomeyDevices(
    selectedDevice: ShellyLocalListDeviceProperties,
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
    };

    return [device];
  }

  public async onPairListDevices(): Promise<ShellyLocalListDeviceProperties[]> {
    const results: Promise<ShellyLocalListDeviceProperties | undefined>[] = [];

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
  ): Promise<ShellyLocalListDeviceProperties | undefined> {
    try {
      const deviceInfoResponse = await Shelly.GetDeviceInfo(createHttpChannel(discoveryResult.address));
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
