import ShellyBleDevice from '../../lib/ble/BleDevice.js';
import type { BTHomeData } from '../../lib/ble/BTHome.js';
import {
  handleBatteryProperty,
  handleHumidityProperty,
  handleSingleButtonEventProperty,
  handleTemperatureProperty,
} from '../../lib/ble/BTHomePropertyHandlers.js';
import type { ButtonEventTypesDeviceInterface } from '../../lib/capabilityInterfaces.js';
import type { ButtonEventType } from '../../lib/flow/buttonFlows.js';

export default class ShellyBluHTZBBleDevice extends ShellyBleDevice implements ButtonEventTypesDeviceInterface {
  public async handleBtHomeForward(btHomeData: BTHomeData): Promise<void> {
    await handleBatteryProperty(this, btHomeData);
    await handleHumidityProperty(this, btHomeData);
    await handleTemperatureProperty(this, btHomeData);
    await handleSingleButtonEventProperty(this, btHomeData);
  }

  public getButtonEventTypes(): ButtonEventType[] {
    return ['single_press', 'hold'];
  }
}
