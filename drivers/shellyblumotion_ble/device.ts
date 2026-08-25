import ShellyBleDevice from '../../lib/ble/BleDevice.js';
import type { BTHomeData } from '../../lib/ble/BTHome.js';
import {
  handleBatteryProperty,
  handleIlluminanceProperty,
  handleMotionProperty,
} from '../../lib/ble/BTHomePropertyHandlers.js';

export default class ShellyBluMotionBleDevice extends ShellyBleDevice {
  public async handleBtHomeForward(btHomeData: BTHomeData): Promise<void> {
    await handleBatteryProperty(this, btHomeData);
    await handleMotionProperty(this, btHomeData);
    await handleIlluminanceProperty(this, btHomeData);
  }
}
