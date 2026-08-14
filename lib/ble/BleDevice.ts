import Homey, { type BleAdvertisement } from 'homey';
import type ShellyApp from '../../app.js';
import type { ShellyBluDeviceData } from '../types.js';
import { type BleForwardEventData, type BTHomeData, parseBleForward, parseBtHomeServiceData } from './BTHome.js';
import type ShellyBleDriver from './BleDriver.js';

const BTHOME_SERVICE_UUID = '0000fcd2-0000-1000-8000-00805f9b34fb';

const MAX_ID = 0xff;
const WINDOW_SIZE = 128;

export default abstract class ShellyBleDevice extends Homey.Device {
  declare public readonly __id: string;

  private newestSeenPacketId: number | undefined;
  private seenPackets = Array(256).fill(false);

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
        this.error('Error while subscribing to BLE advertisement:', e);
      }
    } else {
      this.log('No support for BLE advertisement subscription');
    }
  }

  public async onUninit(): Promise<void> {
    const uuid = this.getTypedData().uuid;
    if (
      // @ts-expect-error Only supported in the newest version of the SDK
      typeof this.homey.hasFeature !== 'undefined' &&
      // @ts-expect-error Only supported in the newest version of the SDK
      this.homey.hasFeature('ble-advertisements') &&
      // @ts-expect-error Only supported in the newest version of the SDK
      typeof this.homey.ble.unsubscribeFromAdvertisements !== 'undefined'
    ) {
      this.log('Unsubscribing from BLE advertisements');
      try {
        // @ts-expect-error Only supported in the newest version of the SDK
        await this.homey.ble.unsubscribeFromAdvertisements(uuid);
      } catch (e) {
        this.error('Error while unsubscribing from BLE advertisement:', e);
      }
    } else {
      this.log('No support for BLE advertisement subscription');
    }
  }

  private async handleHomeyBle(advertisement: BleAdvertisement): Promise<void> {
    this.debugDeduplication('Received Homey advertisement');
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
  }

  private async handleBleForward(data: BleForwardEventData): Promise<void> {
    if (Homey.env['BLE_DEBUG_DEDUPLICATION'] === '1' || Homey.env['BLE_DEBUG_FORWARDING'] === '1') {
      this.debug('Received forwarded advertisement');
    }
    const btHomeData = parseBleForward(data);
    return this.handleBtHomeData(btHomeData);
  }

  private async handleBtHomeData(btHomeData: BTHomeData | undefined): Promise<void> {
    if (btHomeData === undefined) {
      return;
    }

    if (btHomeData?.packetId?.length !== 1) {
      this.error('Invalid BTHome packet ID, ignoring:', btHomeData);
      return;
    }

    const packetId = btHomeData.packetId[0];
    if (this.isDuplicate(packetId)) {
      this.debugDeduplication('Deduplicating:', btHomeData);
      return;
    }

    this.debug('Received BTHome frame:', btHomeData);
    await this.handleBtHomeForward(btHomeData);
  }

  public abstract handleBtHomeForward(data: BTHomeData): Promise<void>;

  private isDuplicate(id: number): boolean {
    // Check whether the id is already seen in the current window.
    // Window is 127 wide, trailing behind the newest seen packetId, and wrapping from 255 to 0.

    const newest = this.newestSeenPacketId;

    if (newest === undefined) {
      this.debugDeduplication('First packet:', id);
      // Mark id as newest seen
      this.seenPackets[id] = true;
      this.newestSeenPacketId = id;
      return false;
    }

    // Modulo is `MAX_ID + 1` so that we wrap back to 0 after MAX_ID.
    // In order to wrap negative numbers to positive we use `(x + modulo) % modulo`
    const modulo = MAX_ID + 1;

    // Check whether the packet newer than this packet (i.e. not in the trailing window)
    const wrappedDistance = (newest - id + modulo) % modulo;
    const inWindow = wrappedDistance < WINDOW_SIZE;

    if (inWindow) {
      this.debugDeduplication(`packet inside ${newest} window:`, id);
      // Packet is inside the trailing window
      // Check whether we have already seen this packet
      const seen = this.seenPackets[id];
      this.seenPackets[id] = true;
      return seen;
    }

    this.debugDeduplication(`packet outside ${newest} window:`, id);

    // Reset all values outside of the window to false
    const lastToReset = (id + WINDOW_SIZE + modulo) % modulo;
    const firstToReset = (newest - (WINDOW_SIZE - 1) + modulo) % modulo;

    this.debugDeduplication('Resetting ids', firstToReset, 'to', lastToReset);

    let index = firstToReset;
    while (true) {
      this.debugDeduplication('Resetting id', index);
      this.seenPackets[index] = false;

      if (index === lastToReset) {
        break;
      }

      index = (index + 1) % modulo;
    }

    // Mark id as newest seen
    this.seenPackets[id] = true;
    this.newestSeenPacketId = id;
    return false;
  }

  public debug(...args: unknown[]): void {
    (this.driver as ShellyBleDriver).debug(`[Device:${this.__id}]`, ...args);
  }

  public debugDeduplication(...args: unknown[]): void {
    if (Homey.env['BLE_DEBUG_DEDUPLICATION'] === '1') {
      this.debug(...args);
    }
  }
}
