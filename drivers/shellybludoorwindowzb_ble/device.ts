import ShellyBleDevice from '../../lib/ble/BleDevice.js';
import type { BTHomeData } from '../../lib/ble/BTHome.js';
import {
  handleBatteryProperty,
  handleLightLevelProperty,
  handleRotationProperty,
  handleWindowProperty,
} from '../../lib/ble/BTHomePropertyHandlers.js';

export default class ShellyBluDoorWindowZBBleDevice extends ShellyBleDevice {
  public async handleBtHomeForward(btHomeData: BTHomeData): Promise<void> {
    await handleBatteryProperty(this, btHomeData);
    await handleWindowProperty(this, btHomeData);
    await handleRotationProperty(this, btHomeData);
    await handleLightLevelProperty(this, btHomeData);
  }
}
