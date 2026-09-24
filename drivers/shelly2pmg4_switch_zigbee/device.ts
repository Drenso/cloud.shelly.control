import initElectricalMeasurementDevice from '@drenso/homey-zigbee-library/capabilities/electricalMeasurement.mjs';
import initMeteringDevice from '@drenso/homey-zigbee-library/capabilities/metering.mjs';
import initOnOffDevice from '@drenso/homey-zigbee-library/capabilities/onOff.mjs';
import zbClusters, { type ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';
import type {
  ButtonEventTypesDeviceInterface,
  ButtonIndicesDeviceInterface,
  SwitchIndicesDeviceInterface,
} from '../../lib/capabilityInterfaces.js';
import type { ButtonEventType } from '../../lib/flow/buttonFlows.js';

export default class Shelly2PMGen4SwitchZigbeeDevice
  extends ShellyZigbeeDevice
  implements ButtonEventTypesDeviceInterface, ButtonIndicesDeviceInterface, SwitchIndicesDeviceInterface
{
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    try {
      await zclNode.endpoints[1].clusters[zbClusters.OnOffCluster.NAME]?.readAttributes(['onOff']);
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
    const inputEndpointId = endpointId + 2;

    await initOnOffDevice(this, zclNode, { endpointId });
    await initMeteringDevice(this, zclNode, {
      endpointId,
      noPowerFactorReporting: true,
    });
    await initElectricalMeasurementDevice(this, zclNode, { endpointId });

    await this.initializeInputFlows(zclNode, [inputEndpointId]);
  }

  public getButtonEventTypes(): ButtonEventType[] {
    return ['single_press', 'double_press', 'triple_press', 'hold'];
  }
}
