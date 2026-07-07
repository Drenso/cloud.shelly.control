import Homey from 'homey';
import type ShellyApp from '../../app.js';
import type { ShellyBluDeviceData } from '../types.js';
import { type BleForwardEventData, parseBleForward } from './BTHome.js';
import type ShellyBleDriver from './BleDriver.js';

export default abstract class ShellyBleDevice extends Homey.Device {
  declare public readonly __id: string;

  public get app(): ShellyApp {
    return this.homey.app as ShellyApp;
  }

  public getTypedData(): ShellyBluDeviceData {
    return this.getData();
  }

  public async onInit(): Promise<void> {
    const macAddress = this.getTypedData().id.toLowerCase();
    this.app.btHomeServer.btHomeMitt.on(macAddress, this.handleBleForward.bind(this));
  }

  protected async handleBleForward(data: BleForwardEventData): Promise<void> {
    // TODO deduplicate using packet id
    const btHomeData = parseBleForward(data);
    if (btHomeData !== undefined) {
      await this.handleBtHomeForward(btHomeData);
    }
  }

  public abstract handleBtHomeForward(data: [string, unknown][]): Promise<void>;

  public debug(...args: unknown[]): void {
    (this.driver as ShellyBleDriver).debug(`[Device:${this.__id}]`, ...args);
  }
}
