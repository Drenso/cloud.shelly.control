import initElectricalMeasurementDevice
  from '@drenso/homey-zigbee-library/capabilities/electricalMeasurement.mjs';
import initMeteringDevice from '@drenso/homey-zigbee-library/capabilities/metering.mjs';
import initOnOffDevice from '@drenso/homey-zigbee-library/capabilities/onOff.mjs';
import type { ZCLNode} from 'zigbee-clusters';
import {OnOffCluster} from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/ZigbeeDevice.mjs';

export default class Shelly2PMGen4SwitchZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    try {
      await zclNode.endpoints[1].clusters[OnOffCluster.NAME]?.readAttributes(['onOff']);
    } catch (error) {
      if (error instanceof Error && error.message === 'UNSUPPORTED_CLUSTER') {
        this.log('Marking as unavailable, wrong type selected by user');
        await this.setUnavailable(this.homey.__('driver.wrongdevice'));
        return;
      }
      this.error(error);
    }
    const isSubDevice = this.isSubDevice();
    const endpointId = isSubDevice ? 2 : 1;

    await initOnOffDevice(this, zclNode, { endpointId });
    await initMeteringDevice(this, zclNode, {
      endpointId,
      noPowerFactorReporting: true,
    });
    await initElectricalMeasurementDevice(this, zclNode, { endpointId });
  }
}
