import type Homey from 'homey';
import { isIPv4 } from 'node:net';
import Shelly from '../component/components/Shelly.js';
import type { ShellyGetDeviceInfoResponse } from '../component/components/Shelly/GetDeviceInfo.js';
import type { ShellyGetComponentsResponseComponent } from '../component/components/Shelly/GetComponents.js';
import { createHttpChannel } from '../HomeyRPCChannels.js';
import { createRequestFrame } from '../rpc/Rpc.js';
import type {
  ShellyDiscoveryResult,
  ShellyLocalListDeviceProperties,
  ShellyLocalListVirtualDeviceProperties,
} from '../types.js';
import ShellyLocalDriver from './LocalDriver.js';
import type ShellyLocalDevice from './LocalDevice.js';
import { LocalRePairingHandler } from './LocalRePairingHandler.js';

export default abstract class ShellyWallDisplayLocalDriver extends ShellyLocalDriver {
  public override readonly configureOutboundWebsocket = false;
  protected abstract readonly model: string;

  protected override onPairMatchDevice(info: ShellyGetDeviceInfoResponse): boolean {
    return info.model === this.model && info.id.toLowerCase().startsWith('shellywalldisplay-');
  }

  public async getDeviceAtAddress(
    rawAddress: string,
    allowPaired = false,
  ): Promise<ShellyLocalListVirtualDeviceProperties> {
    const address = rawAddress.trim();
    if (!isIPv4(address)) {
      throw new Error(this.homey.__('pair.wall_display.invalid_address'));
    }
    const channel = createHttpChannel(this.app, address, this.homey.__, false);
    const { result: info } = await Shelly.GetDeviceInfo(channel);
    if (!this.onPairMatchDevice(info)) {
      throw new Error(this.homey.__('pair.wall_display.wrong_model', { model: info.model }));
    }
    if (!allowPaired && this.app.virtualDevices.has(info.id)) {
      throw new Error(this.homey.__('pair.wall_display.already_paired'));
    }

    let name = this.getDeviceName(info);
    if (!info.auth_en) {
      const { result: config } = await channel.sendRequestFrame<{ device: { name?: string } }>(
        createRequestFrame('Sys.GetConfig'),
      );
      name = config.device?.name || name;
    }
    return {
      name,
      data: { id: info.id, useHttps: channel.useHttps },
      store: {
        address,
        port: 80,
        components: [],
        auth_domain: info.auth_en ? (info.auth_domain ?? info.id) : undefined,
      },
    };
  }

  public override async onPairListDevices(): Promise<ShellyLocalListVirtualDeviceProperties[]> {
    const strategy = this.homey.discovery.getStrategy('shelly');
    const discoveryResults = strategy.getDiscoveryResults() as Record<string, ShellyDiscoveryResult>;
    const addresses = new Set(Object.values(discoveryResults).map(result => result.address));
    const results = await Promise.allSettled([...addresses].map(address => this.getDeviceAtAddress(address)));
    const devices = new Map<string, ShellyLocalListVirtualDeviceProperties>();
    for (const result of results) {
      if (result.status === 'fulfilled') {
        devices.set(result.value.data.id, result.value);
      }
    }
    return [...devices.values()];
  }

  public override async onPair(session: Homey.Driver.PairSession): Promise<void> {
    await super.onPair(session);
    session.setHandler('wall_display_address', (address: string) => this.getDeviceAtAddress(address));
  }

  public override async onRepair(session: Homey.Driver.PairSession, device: ShellyLocalDevice): Promise<void> {
    let address = device.getTypedStore().address;
    const getSelectedDevice = async (): Promise<ShellyLocalListVirtualDeviceProperties> => {
      const selected = await this.getDeviceAtAddress(address, true);
      const data = device.getTypedData();
      if (selected.data.id !== (data.parent ?? data.id)) {
        throw new Error(this.homey.__('pair.wall_display.wrong_device'));
      }
      return selected;
    };
    await new LocalRePairingHandler(
      session,
      device,
      this,
      (...args) => this.log('[Re-Pairing Handler]', ...args),
      (...args) => this.error('[Re-Pairing Handler]', ...args),
      (...args) => this.debug('[Re-Pairing Handler]', ...args),
      getSelectedDevice,
    ).setup();
    session.setHandler('wall_display_address', async (newAddress: string) => {
      address = newAddress;
      return getSelectedDevice();
    });
    session.setHandler('wall_display_current_address', async () => address);
  }

  public override async assembleHomeyDevices(
    selectedDevice: ShellyLocalListVirtualDeviceProperties,
    components: ShellyGetComponentsResponseComponent[],
  ): Promise<ShellyLocalListDeviceProperties[]> {
    // X2i exposes placeholder components for sensors absent from this model.
    // Keep external/addon temperature and humidity components.
    const availableComponents =
      this.model === 'SAWD-5A1XX10EU0'
        ? components.filter(component => !['temperature:0', 'humidity:0'].includes(component.key))
        : components;
    return super.assembleHomeyDevices(selectedDevice, availableComponents);
  }
}
