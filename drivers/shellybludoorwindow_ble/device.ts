import ShellyBleDevice from '../../lib/ble/BleDevice.js';
import type { BTHomeData } from '../../lib/ble/BTHome.js';
import {
  handleBatteryProperty,
  handleIlluminanceProperty,
  handleRotationProperty,
  handleWindowProperty,
} from '../../lib/ble/BTHomePropertyHandlers.js';

export default class ShellyBluDoorWindowBleDevice extends ShellyBleDevice {
  public async handleBtHomeForward(btHomeData: BTHomeData): Promise<void> {
    await handleBatteryProperty(this, btHomeData);
    await handleWindowProperty(this, btHomeData);
    await handleRotationProperty(this, btHomeData);
    await handleIlluminanceProperty(this, btHomeData);
  }
}
