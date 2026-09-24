import initElectricalMeasurementDevice from '@drenso/homey-zigbee-library/capabilities/electricalMeasurement.mjs';
import initMeteringDevice from '@drenso/homey-zigbee-library/capabilities/metering.mjs';
import initOnOffDevice from '@drenso/homey-zigbee-library/capabilities/onOff.mjs';
import type { ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';
import type {
  ButtonEventTypesDeviceInterface,
  ButtonIndicesDeviceInterface,
  SwitchIndicesDeviceInterface,
} from '../../lib/capabilityInterfaces.js';
import type { ButtonEventType } from '../../lib/flow/buttonFlows.js';

export default class Shelly1PMGen4ZigbeeDevice
  extends ShellyZigbeeDevice
  implements ButtonEventTypesDeviceInterface, ButtonIndicesDeviceInterface, SwitchIndicesDeviceInterface
{
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initOnOffDevice(this, zclNode);
    await initMeteringDevice(this, zclNode, {
      noPowerFactorReporting: true,
    });
    await initElectricalMeasurementDevice(this, zclNode);
    await this.initializeInputFlows(zclNode, [2]);
  }

  public getButtonEventTypes(): ButtonEventType[] {
    return ['single_press', 'double_press', 'triple_press', 'hold'];
  }
}
