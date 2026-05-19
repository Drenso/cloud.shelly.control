import type Homey from 'homey';
import type { DiscoveryResultMDNSSD } from 'homey';
import type ShellyLocalDriver from './LocalDriver.js';
import type ShellyLocalDevice from './LocalDevice.js';
import { createHttpChannel } from '../HomeyRPCChannels.js';
import Shelly from '../component/components/Shelly.js';
import type { ShellyGetDeviceInfoResponse } from '../component/components/Shelly/GetDeviceInfo.js';
import type HttpChannel from '../rpc/channel/HttpChannel.js';
import { HttpError } from '../rpc/channel/HttpChannel.js';
import type { ShellyLocalListDeviceProperties, ShellyLocalListVirtualDeviceProperties } from '../types.js';
import type { ShellyGetComponentsResponseComponent } from '../component/components/Shelly/GetComponents.js';

export class LocalRePairingHandler {
  private selectedDevice!: ShellyLocalListVirtualDeviceProperties;

  private homeyDevices!: ShellyLocalListDeviceProperties[];
  private homeyDevicesToAdd!: ShellyLocalListDeviceProperties[];
  private deviceComponents!: ShellyGetComponentsResponseComponent[];

  public constructor(
    private session: Homey.Driver.PairSession,
    private readonly device: ShellyLocalDevice,
    private readonly driver: ShellyLocalDriver,
    public readonly log: (...args: unknown[]) => void,
    public readonly error: (...args: unknown[]) => void,
    public readonly debug: (...args: unknown[]) => void,
  ) {}

  public async setup(): Promise<void> {
    this.log('Re-pairing', this.device.getTypedData().id);

    // Update device info
    // Update password and connection data if needed
    this.session.setHandler('showView', async () => {
      await this.selectDevice();
      await this.processDevice();
    });
    // Check a given password is correct
    // Assemble Homey devices for the now authenticated device
    this.session.setHandler('credentials', this.checkCredentials.bind(this));
    this.session.setHandler('authentication_done', this.addSubdevices.bind(this));
    // Re-add missing Homey devices
    this.session.setHandler('add_subdevices', async () => {
      return this.homeyDevicesToAdd ?? [];
    });
    // Recreate the virtual device with the new password and devices
    this.session.setHandler('done', this.recreateVirtualDevice.bind(this));
  }

  private async addSubdevices(): Promise<void> {
    this.debug('adding subdevices');
    await this.session.emit('add_subdevices', undefined);
  }

  private async selectDevice(): Promise<void> {
    this.debug('selecting device');
    const oldData = this.device.getTypedData();
    const shellyDeviceId = oldData.parent ?? oldData.id;

    const discoveryStrategy = this.driver.homey.discovery.getStrategy('shelly');
    const discoveryResults = discoveryStrategy.getDiscoveryResults() as Record<string, DiscoveryResultMDNSSD>;

    const deviceInfoResults = await Promise.allSettled(
      Object.values(discoveryResults).map(async discoveryResult => {
        const httpChannel = createHttpChannel(discoveryResult.address, this.driver.homey.__, false);
        const deviceInfoResponse = await Shelly.GetDeviceInfo(httpChannel);
        return { deviceInfo: deviceInfoResponse.result, httpChannel: httpChannel, discoveryResult: discoveryResult };
      }),
    );

    let deviceInfo: ShellyGetDeviceInfoResponse | undefined = undefined;
    let httpChannel: HttpChannel | undefined = undefined;
    let discoveryResult: DiscoveryResultMDNSSD | undefined = undefined;

    for (const deviceInfoResult of deviceInfoResults) {
      if (deviceInfoResult.status === 'rejected') {
        continue;
      }

      const result = deviceInfoResult.value;

      if (result.deviceInfo.id === shellyDeviceId) {
        deviceInfo = result.deviceInfo;
        httpChannel = result.httpChannel;
        discoveryResult = result.discoveryResult;
        break;
      }
    }

    if (deviceInfo === undefined || httpChannel === undefined || discoveryResult === undefined) {
      // TODO translate
      throw new Error('Could not find device again');
    }

    // Update device info
    this.selectedDevice = {
      name: deviceInfo.name ?? this.driver.getDefaultName(),
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

    this.log('Found device again:', this.selectedDevice);
  }

  private async processDevice(): Promise<void> {
    this.debug('processing device');
    if (this.selectedDevice.store.auth_domain !== undefined) {
      await this.authenticateDevice();
    } else {
      await this.assembleDevice();
      await this.addSubdevices();
    }
  }

  private async authenticateDevice(): Promise<void> {
    this.debug('authenticating device');
    const authenticationData = {
      title: this.selectedDevice.name,
      id: this.selectedDevice.data.id,
    };
    await this.session.emit('all_credentials_devices', [authenticationData]).catch(this.error);
  }

  private async assembleDevice(ha1?: string): Promise<void> {
    this.debug('assembling device');
    const selectedDevice = this.selectedDevice;
    const components = await Shelly.getAllComponents(
      createHttpChannel(selectedDevice.store.address, this.driver.homey.__, selectedDevice.data.useHttps, ha1),
    );

    // ha1 has been verified, it can now be stored
    selectedDevice.store.ha1 = ha1;

    const { addonComponents, mainComponents } = this.driver.splitComponents(components);
    const homeyDevices = await this.driver.assembleHomeyDevices(selectedDevice, mainComponents);

    if (addonComponents.length > 0) {
      const addonDevice = await this.driver.assembleAddonHomeyDevices(selectedDevice, addonComponents);
      homeyDevices.push(...addonDevice);
    }

    const homeyDeviceToAdd = homeyDevices.filter(homeyDevice => {
      const localDevice = this.driver.app.getLocalDevice(homeyDevice.data.id);
      this.debug('Found for', homeyDevice.data.id, localDevice?.__id);
      return localDevice === undefined;
    });

    this.homeyDevices = homeyDevices;
    this.homeyDevicesToAdd = homeyDeviceToAdd;
    this.debug('Re-adding', homeyDeviceToAdd.length, 'of', homeyDevices.length);
    this.deviceComponents = components;
  }

  private async checkCredentials({ ha1 }: { id: string; ha1: string }): Promise<boolean> {
    try {
      await this.assembleDevice(ha1);
      return true;
    } catch (err) {
      if (err instanceof HttpError && err.code === 401) {
        this.debug('Wrong password');
        return false;
      } else {
        throw err;
      }
    }
  }

  private async recreateVirtualDevice(): Promise<void> {
    this.debug('recreating virtual device');
    const app = this.driver.app;
    const virtualDevice = app.virtualDevices.get(this.selectedDevice.data.id);
    if (virtualDevice === undefined) {
      throw new Error(`No virtual device with ID: ${this.selectedDevice.data.id}`);
    } else {
      virtualDevice
        .recreate(
          {
            ipAddress: this.selectedDevice.store.address,
            useHttps: this.selectedDevice.data.useHttps,
            ha1: this.selectedDevice.store.ha1,
          },
          this.homeyDevices,
          this.deviceComponents,
        )
        .catch(this.error);
    }
  }
}
