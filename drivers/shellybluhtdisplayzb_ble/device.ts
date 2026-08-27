import ShellyBleDevice from '../../lib/ble/BleDevice.js';
import type { BTHomeData } from '../../lib/ble/BTHome.js';
import {
  handleBatteryProperty,
  handleHumidityProperty,
  handleLightLevelProperty,
  handleTemperatureProperty,
} from '../../lib/ble/BTHomePropertyHandlers.js';

export default class ShellyBluHTDisplayZBBleDevice extends ShellyBleDevice {
  public async handleBtHomeForward(btHomeData: BTHomeData): Promise<void> {
    await handleBatteryProperty(this, btHomeData);
    await handleHumidityProperty(this, btHomeData);
    await handleTemperatureProperty(this, btHomeData);
    await handleLightLevelProperty(this, btHomeData);
  }
}
