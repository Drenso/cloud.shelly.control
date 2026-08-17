import ShellyBleDevice from '../../lib/ble/BleDevice.js';
import type { BTHomeData } from '../../lib/ble/BTHome.js';
import { handleBatteryProperty, handleButtonEventProperty } from '../../lib/ble/BTHomePropertyHandlers.js';
import type { ButtonCountDeviceInterface, ButtonEventTypesDeviceInterface } from '../../lib/capabilityInterfaces.js';
import type { ButtonEventType } from '../../lib/flow/buttonFlows.js';

export default class ShellyBluRCButton4BleDevice
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
    return ['single_press', 'double_press', 'triple_press', 'long_press', 'hold'];
  }
}
