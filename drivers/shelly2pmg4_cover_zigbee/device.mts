import initWindowCoveringsDevice from '@drenso/homey-zigbee-library/capabilities/windowCoverings.mjs';
import { WindowCoveringCluster, type ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/ZigbeeDevice.mjs';

export default class Shelly2PMGen4CoverZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    try {
      await zclNode.endpoints[1].clusters[WindowCoveringCluster.NAME]?.readAttributes(['currentPositionLift1']);
    } catch (error) {
      if (error instanceof Error && error.message === 'UNSUPPORTED_CLUSTER') {
        this.log('Marking as unavailable, wrong type selected by user');
        await this.setUnavailable(this.homey.__('driver.wrongdevice'));
        return;
      }
      this.error(error);
    }

    await initWindowCoveringsDevice(this, zclNode);
  }
}
