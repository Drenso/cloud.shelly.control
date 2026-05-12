import type Homey from 'homey';
import type { ShellyLocalListDeviceProperties, ShellyLocalListVirtualDeviceProperties } from '../types.js';
import Shelly from '../component/components/Shelly.js';
import { createHttpChannel } from '../HomeyRPCChannels.js';
import type ShellyLocalDriver from './LocalDriver.js';
import type { ShellyGetComponentsResponseComponent } from '../component/components/Shelly/GetComponents.js';
import { HttpError } from '../rpc/channel/HttpChannel.js';

export class LocalPairingHandler {
  private selectedDevices: ShellyLocalListVirtualDeviceProperties[] = [];
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
    this.session.setHandler('authentication_done', () => this.session.showView('add_subdevices'));
    this.session.setHandler('add_subdevices', async () => this.allHomeyDevices);
    // Add virtual devices for the added devices
    this.session.setHandler('done', this.addVirtualDevices.bind(this));
  }

  private async processSelectedDevices(): Promise<void> {
    const selectedDevicesNeedAuthentication: Array<ShellyLocalListVirtualDeviceProperties> = [];
    for (const selectedDevice of this.selectedDevices) {
      if (selectedDevice.store.auth_domain !== undefined) {
        selectedDevicesNeedAuthentication.push(selectedDevice);
      } else {
        await this.assembleDevice(selectedDevice);
      }
    }

    if (selectedDevicesNeedAuthentication.length > 0) {
      await this.authenticateDevices(selectedDevicesNeedAuthentication);
    } else {
      await this.session.showView('add_subdevices').catch(this.error);
    }
  }

  private async addVirtualDevices(): Promise<void> {
    for (const selectedDevice of this.selectedDevices) {
      const components = this.deviceComponents.get(selectedDevice.data.id)!;
      const homeyDevices = this.childHomeyDevices.get(selectedDevice.data.id)!;
      const virtualDevice = await this.driver.createVirtualDevice(selectedDevice, components, homeyDevices);
      await this.driver.app.addVirtualDevice(virtualDevice);
    }
  }

  private async authenticateDevices(selectedDevices: Array<ShellyLocalListVirtualDeviceProperties>): Promise<void> {
    const authenticationData = selectedDevices.map(selectedDevice => ({
      title: selectedDevice.name,
      id: selectedDevice.data.id,
    }));
    await this.session.showView('device_password').catch(this.error);
    await this.session.emit('all_credentials_devices', authenticationData);
  }

  private async assembleDevice(selectedDevice: ShellyLocalListVirtualDeviceProperties, ha1?: string): Promise<void> {
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

    this.allHomeyDevices.push(...homeyDevices);
    this.deviceComponents.set(selectedDevice.data.id, components);
    this.childHomeyDevices.set(selectedDevice.data.id, homeyDevices);
  }

  private async checkCredentials({ id, ha1 }: { id: string; ha1: string }): Promise<boolean> {
    const authenticationDevice = this.selectedDevices.find(device => device.data.id === id);
    if (authenticationDevice === undefined) {
      throw new Error(`No device with ID ${id} being authenticated`);
    }

    try {
      await this.assembleDevice(authenticationDevice, ha1);
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
