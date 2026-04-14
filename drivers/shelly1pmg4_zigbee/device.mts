import initElectricalMeasurementDevice from '@drenso/homey-zigbee-library/capabilities/electricalMeasurement.mjs';
import initMeteringDevice from '@drenso/homey-zigbee-library/capabilities/metering.mjs';
import initOnOffDevice from '@drenso/homey-zigbee-library/capabilities/onOff.mjs';
import type { ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.mjs';

export default class Shelly1PMGen4ZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initOnOffDevice(this, zclNode);
    await initMeteringDevice(this, zclNode, {
      noPowerFactorReporting: true,
    });
    await initElectricalMeasurementDevice(this, zclNode);
  }
}
