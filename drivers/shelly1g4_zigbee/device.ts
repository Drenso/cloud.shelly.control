import initOnOffDevice from '@drenso/homey-zigbee-library/capabilities/onOff.mjs';
import type { ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';
import type {
  ButtonEventTypesDeviceInterface,
  ButtonIndicesDeviceInterface,
  SwitchIndicesDeviceInterface,
} from '../../lib/capabilityInterfaces.js';
import type { ButtonEventType } from '../../lib/flow/buttonFlows.js';

export default class Shelly1Gen4ZigbeeDevice
  extends ShellyZigbeeDevice
  implements ButtonEventTypesDeviceInterface, ButtonIndicesDeviceInterface, SwitchIndicesDeviceInterface
{
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initOnOffDevice(this, zclNode);
    await this.initializeInputFlows(zclNode, [2]);
  }

  public getButtonEventTypes(): ButtonEventType[] {
    return ['single_press', 'double_press', 'triple_press', 'hold'];
  }
}
