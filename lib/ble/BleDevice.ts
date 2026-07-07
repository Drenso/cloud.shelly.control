import Homey, { type BleAdvertisement } from 'homey';
import type ShellyApp from '../../app.js';
import type { ShellyBluDeviceData } from '../types.js';
import { type BleForwardEventData, parseBleForward, parseBtHomeServiceData } from './BTHome.js';
import type ShellyBleDriver from './BleDriver.js';

const BTHOME_SERVICE_UUID = '0000fcd2-0000-1000-8000-00805f9b34fb';

export default abstract class ShellyBleDevice extends Homey.Device {
  declare public readonly __id: string;

  private pollInterval: NodeJS.Timeout | undefined;

  public constructor(...args: unknown[]) {
    super(...(args as never[]));
    this.handleBleForward = this.handleBleForward.bind(this);
  }

  public get app(): ShellyApp {
    return this.homey.app as ShellyApp;
  }

  public getTypedData(): ShellyBluDeviceData {
    return this.getData();
  }

  public async onInit(): Promise<void> {
    const macAddress = this.getTypedData().id.toLowerCase();
    this.app.btHomeServer.btHomeMitt.on(macAddress, this.handleBleForward);

    const uuid = this.getTypedData().uuid;

    if (
      // @ts-expect-error Only supported in the newest version of the SDK
      typeof this.homey.hasFeature !== 'undefined' &&
      // @ts-expect-error Only supported in the newest version of the SDK
      this.homey.hasFeature('ble-advertisements') &&
      // @ts-expect-error Only supported in the newest version of the SDK
      typeof this.homey.ble.subscribeToAdvertisements !== 'undefined'
    ) {
      this.log('Subscribing to BLE advertisements');
      try {
        // @ts-expect-error Only supported in the newest version of the SDK
        await this.homey.ble.subscribeToAdvertisements(uuid, {}, (advertisement: BleAdvertisement) => {
          this.handleHomeyBle(advertisement).catch(err =>
            this.error('Error while handling advertisement subscription:', err),
          );
        });
      } catch (e) {
        this.error('Error while finding BLE device:', e);
      }
    } else {
      this.log('No support for BLE advertisement subscription');
    }
  }

  private async handleHomeyBle(advertisement: BleAdvertisement): Promise<void> {
    for (const service of advertisement.serviceData) {
      if (service.uuid === BTHOME_SERVICE_UUID) {
        const btHomeData = parseBtHomeServiceData(service.data);
        return this.handleBtHomeData(btHomeData);
      }
    }
  }

  public async onDeleted(): Promise<void> {
    const macAddress = this.getTypedData().id.toLowerCase();
    this.app.btHomeServer.btHomeMitt.off(macAddress, this.handleBleForward);
    this.homey.clearInterval(this.pollInterval);
  }

  private async handleBleForward(data: BleForwardEventData): Promise<void> {
    const btHomeData = parseBleForward(data);
    return this.handleBtHomeData(btHomeData);
  }

  private async handleBtHomeData(btHomeData: [string, unknown][] | undefined): Promise<void> {
    if (btHomeData === undefined) {
      return;
    }

    // TODO deduplicate using packet id
    if (Homey.env['DEBUG_BLE_FORWARDING'] === '1') {
      const properties = btHomeData.map(entry => entry[0]);
      this.log('Received BTHome frame:', properties);
    }
    await this.handleBtHomeForward(btHomeData);
  }

  public abstract handleBtHomeForward(data: [string, unknown][]): Promise<void>;

  public debug(...args: unknown[]): void {
    (this.driver as ShellyBleDriver).debug(`[Device:${this.__id}]`, ...args);
  }
}
