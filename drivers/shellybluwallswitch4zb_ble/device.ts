import ShellyBleDevice from '../../lib/ble/BleDevice.js';
import type { BTHomeData } from '../../lib/ble/BTHome.js';
import {
  type ButtonEventType,
  handleBatteryProperty,
  handleButtonEventProperty,
} from '../../lib/ble/BTHomePropertyHandlers.js';
import type { ButtonCountDeviceInterface, ButtonEventTypesDeviceInterface } from '../../lib/capabilityInterfaces.js';

export default class ShellyBluWallSwitchZBBleDevice
  extends ShellyBleDevice
  implements ButtonCountDeviceInterface, ButtonEventTypesDeviceInterface
{
  public async handleBtHomeForward(btHomeData: BTHomeData): Promise<void> {
    await handleBatteryProperty(this, btHomeData);
    await handleButtonEventProperty(this, btHomeData);
  }

  public getButtonCount(): number {
    return 4;
  }

  public getButtonEventTypes(): ButtonEventType[] {
    return [
      'single_press',
      'double_press',
      'triple_press',
      'long_press',
      'long_double_press',
      'long_triple_press',
      'hold',
    ];
  }
}
