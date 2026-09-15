import initWindowCoveringsDevice from '@drenso/homey-zigbee-library/capabilities/windowCoverings.mjs';
import zbClusters, { type WindowCoveringCluster, type ZCLNode } from 'zigbee-clusters';
import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';
import { safeAddCapability, safeRemoveCapability } from '../../lib/safeFunctions.js';

export default class Shelly2PMGen4CoverZigbeeDevice extends ShellyZigbeeDevice {
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    const cluster = zclNode.endpoints[1].clusters[zbClusters.WindowCoveringCluster.NAME] as WindowCoveringCluster;

    try {
      await cluster?.readAttributes(['currentPositionLift']);
    } catch (error) {
      if (error instanceof Error && error.message === 'UNSUPPORTED_CLUSTER') {
        this.log('Marking as unavailable, wrong type selected by user');
        await this.setUnavailable(this.homey.__('driver.wrongdevice'));
        return;
      }
      this.error(error);
    }

    const { windowCoveringType } = await cluster.readAttributes(['windowCoveringType']);
    this.debug('Window covering type:', windowCoveringType);

    if (windowCoveringType === 'tiltBlindLiftAndTilt') {
      await safeAddCapability(this, 'windowcoverings_tilt_set');
    } else {
      await safeRemoveCapability(this, 'windowcoverings_tilt_set');
    }

    await initWindowCoveringsDevice(this, zclNode, { invertPercentage: true });
  }
}
