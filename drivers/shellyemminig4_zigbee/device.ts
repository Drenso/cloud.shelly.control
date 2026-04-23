import initElectricalMeasurementDevice from '@drenso/homey-zigbee-library/capabilities/electricalMeasurement.mjs';
import initMeteringDevice from '@drenso/homey-zigbee-library/capabilities/metering.mjs';
import type { ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';

export default class ShellyEMMiniGen4ZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initMeteringDevice(this, zclNode, {
      noPowerFactorReporting: true,
    });
    await initElectricalMeasurementDevice(this, zclNode);
  }
}
