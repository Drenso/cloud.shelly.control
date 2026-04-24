import type { ZigBeeNode } from 'homey';
import Homey from 'homey';
import { ZigBeeDevice } from 'homey-zigbeedriver';
import type { ZCLNode } from 'zigbee-clusters';
import { type QueuedWorker, queueWorker } from '../global-promise-queue.js';
import Logger from '../log/Logger.js';

export default abstract class ShellyZigbeeDevice extends ZigBeeDevice {
  protected logger?: Logger = undefined;
  private queuedWorker?: QueuedWorker;

  public async onNodeInit(payload: { zclNode: ZCLNode; node: ZigBeeNode }): Promise<void> {
    this.logger = new Logger(
      this,
      super.log,
      super.error,
      this.isSubDevice() ? `sub:${this.getData().subDeviceId}` : 'main',
    );

    if (Homey.env.ZB_DEBUG === '1') {
      this.enableDebug();
    }

    // Mark as unavailable during startup
    await this.setUnavailable(this.homey.__('device.initializing'));

    this.queuedWorker = queueWorker('zigbee', async () => {
      try {
        this.debug('Running queued worker');
        await this.doConfiguration(payload.zclNode).catch(this.error);
      } catch (e) {
        this.error(e);
        this.setUnavailable(this.homey.__('device.failed_to_initialize')).catch(this.error);
      }
    });
    this.queuedWorker.promise.then(() => delete this.queuedWorker);

    return super.onNodeInit(payload);
  }

  public async onUninit(): Promise<void> {
    if (this.queuedWorker) {
      this.queuedWorker.context.cancel = true;
    }
  }

  private async doConfiguration(zclNode: ZCLNode): Promise<void> {
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
  }

  /** Use this method to configure the device-specific capabilities */
  protected abstract configureDevice(zclNode: ZCLNode): Promise<void>;

  /** Use this method to configure anything that needs to be configured at first initialization */
  protected async firstInitConfigureDevice(_zclNode: ZCLNode): Promise<void> {
    // To override
  }

  public log(...args: unknown[]): void {
    if (this.logger) {
      this.logger.log(...args);
    } else {
      super.log(...args);
    }
  }

  public error(...args: unknown[]): void {
    if (this.logger) {
      this.logger.error(...args);
    } else {
      super.error(...args);
    }
  }

  public debug(...args: unknown[]): void {
    this.logger?.debug(...args);
  }
}
