import ShellyBleDevice from '../../lib/ble/BleDevice.js';
import type { BTHomeData } from '../../lib/ble/BTHome.js';
import { handleBatteryProperty, handleSingleButtonEventProperty } from '../../lib/ble/BTHomePropertyHandlers.js';
import type { ButtonEventTypesDeviceInterface } from '../../lib/capabilityInterfaces.js';
import type { ButtonEventType } from '../../lib/flow/buttonFlows.js';

export default class ShellyBluButtonTough1ZBBleDevice
  extends ShellyBleDevice
  implements ButtonEventTypesDeviceInterface
{
  public async handleBtHomeForward(btHomeData: BTHomeData): Promise<void> {
    await handleBatteryProperty(this, btHomeData);
    await handleSingleButtonEventProperty(this, btHomeData);
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
