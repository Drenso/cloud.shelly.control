import ShellyBleDevice from '../../lib/ble/BleDevice.js';
import type { BTHomeData } from '../../lib/ble/BTHome.js';
import {
  handleBatteryProperty,
  handleDistanceProperty,
  handleVibrationProperty,
} from '../../lib/ble/BTHomePropertyHandlers.js';

export default class ShellyBluDistanceBleDevice extends ShellyBleDevice {
  public async handleBtHomeForward(btHomeData: BTHomeData): Promise<void> {
    await handleBatteryProperty(this, btHomeData);
    await handleDistanceProperty(this, btHomeData);
    await handleVibrationProperty(this, btHomeData, true);
  }
}
