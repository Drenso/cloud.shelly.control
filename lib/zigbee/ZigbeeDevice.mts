import type { ZigBeeNode } from 'homey';
import Homey from 'homey';
import { ZigBeeDevice } from 'homey-zigbeedriver';
import zbClusters, { type ZCLNode } from 'zigbee-clusters';
import type ShellyZigbeeDriver from './ZigbeeDriver.mjs';

export default abstract class ShellyZigbeeDevice extends ZigBeeDevice {
  private startupTimeout: NodeJS.Timeout | null = null;

  public async onNodeInit(payload: { zclNode: ZCLNode; node: ZigBeeNode }): Promise<void> {
    if (Homey.env.ZB_DEBUG === '1') {
      this.enableDebug();
      zbClusters.debug();
    }

    // Mark as unavailable during startup
    await this.setUnavailable(this.homey.__('device.initializing'));

    this.startupTimeout = this.homey.setTimeout(
      () => this.doConfiguration(payload.zclNode).catch(this.error),
      this.getDriver().getStartupTimeout(),
    );

    return super.onNodeInit(payload);
  }

  public async onUninit(): Promise<void> {
    this.homey.clearTimeout(this.startupTimeout);

    return super.onUninit();
  }

  private async doConfiguration(zclNode: ZCLNode): Promise<void> {
    try {
      this.debug('Starting configuration...');

      if (this.getStoreValue('initialized') !== true) {
        await this.firstInitConfigureDevice(zclNode);
        await this.setStoreValue('initialized', true).catch(this.error);
      }

      // Let the device configure itself
      await this.configureDevice(zclNode);

      // Mark as available
      await this.setAvailable();

      this.debug('Configuration completed!');
    } finally {
      this.getDriver().markInitialized();
    }
  }

  /** Use this method to configure the device-specific capabilities */
  protected abstract configureDevice(zclNode: ZCLNode): Promise<void>;

  /** Use this method to configure anything that needs to be configured at first initialization */
  protected async firstInitConfigureDevice(_zclNode: ZCLNode): Promise<void> {
    // To override
  }

  protected getDriver(): ShellyZigbeeDriver {
    return this.driver as ShellyZigbeeDriver;
  }
}
