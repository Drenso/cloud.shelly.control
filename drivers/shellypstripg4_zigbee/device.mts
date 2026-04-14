import initElectricalMeasurementDevice from '@drenso/homey-zigbee-library/capabilities/electricalMeasurement.mjs';
import initMeteringDevice from '@drenso/homey-zigbee-library/capabilities/metering.mjs';
import initOnOffDevice from '@drenso/homey-zigbee-library/capabilities/onOff.mjs';
import type { ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.mjs';

export default class ShellyPowerStrip4Gen4ZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    let endpointId;
    if (this.isSubDevice()) {
      const { subDeviceId } = this.getData();
      endpointId = parseInt(subDeviceId.slice(-1));
    } else {
      endpointId = 1;
    }

    await initOnOffDevice(this, zclNode, { endpointId });
    await initMeteringDevice(this, zclNode, {
      endpointId,
      noPowerFactorReporting: true,
    });
    await initElectricalMeasurementDevice(this, zclNode, { endpointId });
  }
}
