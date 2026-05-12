import type Homey from 'homey';
import type { ShellyLocalListDeviceProperties, ShellyLocalListVirtualDeviceProperties } from '../types.js';
import Shelly from '../component/components/Shelly.js';
import { createHttpChannel } from '../HomeyRPCChannels.js';
import type ShellyLocalDriver from './LocalDriver.js';
import type { ShellyGetComponentsResponseComponent } from '../component/components/Shelly/GetComponents.js';
import { HttpError } from '../rpc/channel/HttpChannel.js';

export class LocalPairingHandler {
  private selectedDevices: ShellyLocalListVirtualDeviceProperties[] = [];

  private authenticationDevice?: ShellyLocalListVirtualDeviceProperties;
  private authenticationPromise?: Promise<string>;
  private resolveAuthentication?: (password: string) => void;
  private rejectAuthentication?: (reason?: unknown) => void;

  private deviceComponents = new Map<string, ShellyGetComponentsResponseComponent[]>();
  private childHomeyDevices = new Map<string, ShellyLocalListDeviceProperties[]>();
  private allHomeyDevices: ShellyLocalListDeviceProperties[] = [];

  public constructor(
    private session: Homey.Driver.PairSession,
    private readonly driver: ShellyLocalDriver,
    public readonly log: (...args: unknown[]) => void,
    public readonly error: (...args: unknown[]) => void,
    public readonly debug: (...args: unknown[]) => void,
  ) {}

  public async setup(): Promise<void> {
    // Store the devices selected by the user
    this.session.setHandler('list_devices_selection', async (data: ShellyLocalListVirtualDeviceProperties[]) => {
      this.selectedDevices = data;
    });
    // Ask for a password for devices that use them
    // Assemble Homey devices directly for those that do not
    this.session.setHandler('showView', async (view: string) => {
      if (view !== 'authenticate_devices') {
        return;
      }
      await this.processSelectedDevices();
    });
    // Check a given password is correct
    // Assemble Homey devices for the now authenticated device
    this.session.setHandler('credentials', this.checkCredentials.bind(this));
    // Add all assembled Homey devices
    this.session.setHandler('add_subdevices', async () => this.allHomeyDevices);
    // Add virtual devices for the added devices
    this.session.setHandler('done', this.addVirtualDevices.bind(this));
    // Abort any authentication attempts if the session is disconnected
    this.session.setHandler('disconnect', async () => {
      this.rejectAuthentication?.('session disconnected');
    });
  }

  private async processSelectedDevices(): Promise<void> {
    for (const selectedDevice of this.selectedDevices) {
      if (selectedDevice.store.auth_domain !== undefined) {
        await this.authenticateDevice(selectedDevice);
      } else {
        await this.assembleDevice(selectedDevice);
      }
    }
    await this.session.showView('add_subdevices').catch(this.error);
  }

  private async addVirtualDevices(): Promise<void> {
    this.log('Added subdevices, registering virtual device...');
    for (const selectedDevice of this.selectedDevices) {
      const components = this.deviceComponents.get(selectedDevice.data.id)!;
      const homeyDevices = this.childHomeyDevices.get(selectedDevice.data.id)!;
      const virtualDevice = await this.driver.createVirtualDevice(selectedDevice, components, homeyDevices);
      await this.driver.app.addVirtualDevice(virtualDevice);
    }
  }

  private async authenticateDevice(selectedDevice: ShellyLocalListVirtualDeviceProperties): Promise<void> {
    this.authenticationDevice = selectedDevice;
    this.authenticationPromise = new Promise((resolve, reject) => {
      this.resolveAuthentication = resolve;
      this.rejectAuthentication = reject;
    });
    await this.session.showView('device_password').catch(this.error);
    await this.session
      .emit('credentials_device', {
        title: selectedDevice.name,
        id: selectedDevice.data.id,
      })
      .catch(this.error);
    selectedDevice.store.ha1 = await this.authenticationPromise;
    this.authenticationDevice = undefined;
    this.authenticationPromise = undefined;
    this.resolveAuthentication = undefined;
    this.rejectAuthentication = undefined;
  }

  private async assembleDevice(selectedDevice: ShellyLocalListVirtualDeviceProperties, ha1?: string): Promise<void> {
    const components = await Shelly.getAllComponents(
      createHttpChannel(selectedDevice.store.address, this.driver.homey.__, selectedDevice.data.useHttps, ha1),
    );
    const { addonComponents, mainComponents } = this.driver.splitComponents(components);
    const homeyDevices = await this.driver.assembleHomeyDevices(selectedDevice, mainComponents);

    if (addonComponents.length > 0) {
      const addonDevice = await this.driver.assembleAddonHomeyDevices(selectedDevice, addonComponents);
      homeyDevices.push(...addonDevice);
    }

    this.allHomeyDevices.push(...homeyDevices);
    this.deviceComponents.set(selectedDevice.data.id, components);
    this.childHomeyDevices.set(selectedDevice.data.id, homeyDevices);
  }

  private async checkCredentials(ha1: string): Promise<boolean> {
    if (this.authenticationDevice === undefined) {
      throw new Error('No device being authenticated');
    }

    try {
      await this.assembleDevice(this.authenticationDevice, ha1);
      this.resolveAuthentication!(ha1);
      return true;
    } catch (err) {
      if (err instanceof HttpError && err.code === 401) {
        return false;
      } else {
        throw err;
      }
    }
  }
}
