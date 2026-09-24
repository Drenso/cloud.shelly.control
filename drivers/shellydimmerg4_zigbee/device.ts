import ShellyZigbeeDevice from '../../lib/zigbee/ZigbeeDevice.js';
import type { ZCLNode } from 'zigbee-clusters';
import initOnOffDevice from '@drenso/homey-zigbee-library/capabilities/onOff.mjs';
import initMeteringDevice from '@drenso/homey-zigbee-library/capabilities/metering.mjs';
import initElectricalMeasurementDevice from '@drenso/homey-zigbee-library/capabilities/electricalMeasurement.mjs';
import { type ClusterSpecification, Util } from 'homey-zigbeedriver';
import initDimDevice from '@drenso/homey-zigbee-library/capabilities/dim.mjs';
import type {
  ButtonEventTypesDeviceInterface,
  ButtonIndicesDeviceInterface,
  SwitchIndicesDeviceInterface,
} from '../../lib/capabilityInterfaces.js';
import type { ButtonEventType } from '../../lib/flow/buttonFlows.js';

export default class ShellyDimmerGen4ZigbeeDevice
  extends ShellyZigbeeDevice
  implements ButtonEventTypesDeviceInterface, ButtonIndicesDeviceInterface, SwitchIndicesDeviceInterface
{
  protected async configureDevice(zclNode: ZCLNode): Promise<void> {
    await initDimDevice(this, zclNode);
    await initOnOffDevice(this, zclNode);
    await initMeteringDevice(this, zclNode, {
      noPowerFactorReporting: true,
    });
    await initElectricalMeasurementDevice(this, zclNode);
    await this.initializeInputFlows(zclNode, [2, 3]);
  }

  public getButtonEventTypes(): ButtonEventType[] {
    return ['single_press', 'double_press', 'triple_press', 'hold'];
  }

  /**
   * @override We override this method so we can handle errors thrown when dimming while the device is uncalibrated.
   */
  public _registerCapabilitySet(capabilityId: string, cluster: ClusterSpecification): void {
    Util.assertClusterSpecification(cluster);
    Util.assertCapabilityId(capabilityId, this.hasCapability.bind(this));

    this.debug(`register capability set, capability ${capabilityId}, cluster: ${cluster.NAME}`);

    // Register the capability and attach a listener to act on a capability change by the user
    const capabilityListener = async (value: unknown, opts: object): Promise<void> => {
      const errorHandler = this.createCapabilityListenerErrorHandler(capabilityId, cluster.NAME, value);
      return this.setClusterCapabilityValue(capabilityId, cluster, value, opts).catch(errorHandler);
    };

    this.registerCapabilityListener(capabilityId, capabilityListener);
  }

  private createCapabilityListenerErrorHandler(capabilityId: string, clusterName: string, value: unknown) {
    return (err: Error): never => {
      this.error(
        `Error: failed to set cluster capability value (capability: ${capabilityId}, cluster: ${clusterName}, value: ${value})`,
        err,
      );

      if (capabilityId === 'dim' && err.message === 'ACTION_DENIED') {
        throw new Error(this.homey.__('error.uncalibrated'));
      }

      if (err && err.message) {
        throw new Error(err.message);
      }

      throw new Error(this.zigbeedriverI18n('error.command_failed'));
    };
  }
}
