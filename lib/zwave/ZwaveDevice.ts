import Homey, { type ZwaveNode } from 'homey';
import { ZwaveDevice } from 'homey-zwavedriver';
import { type QueuedWorker, queueWorker } from '../global-promise-queue.js';
import Logger from '../log/Logger.js';
import { safeSetCapabilityValue } from '../safeFunctions.js';

export default abstract class ShellyZwaveDevice extends ZwaveDevice {
  protected logger?: Logger = undefined;
  private queuedWorker?: QueuedWorker;

  public async onNodeInit(payload: { node: ZwaveNode }): Promise<void> {
    this.logger = new Logger(
      this,
      super.log,
      super.error,
      this.node.isMultiChannelNode ? `chan:${this.node.multiChannelNodeId}` : 'main',
    );

    if (Homey.env.ZWAVE_DEBUG === '1') {
      this.enableDebug();
    }

    // Mark as unavailable during startup
    await this.setUnavailable(this.homey.__('device.initializing'));

    await super.onNodeInit(payload);

    this.queuedWorker = queueWorker('zwave', async () => {
      try {
        this.debug('Running queued worker');
        await this.doConfiguration(payload.node);
      } catch (error) {
        this.error('Failed initialisation', error);
        this.setUnavailable(this.homey.__('device.failed_to_initialize')).catch(this.error);
      }
    });
    this.queuedWorker.promise.then(() => delete this.queuedWorker);
  }

  public async onUninit(): Promise<void> {
    if (this.queuedWorker) {
      this.queuedWorker.context.cancel = true;
    }
  }

  private async doConfiguration(zwaveNode: ZwaveNode): Promise<void> {
    this.debug('Starting configuration...');

    if (this.getStoreValue('initialized') !== true) {
      await this.configureMaintenanceButtons();
      await this.firstInitConfigureDevice(zwaveNode);
      await this.setStoreValue('initialized', true).catch(this.error);
    }

    // Let the device configure itself
    await this.configureDevice(zwaveNode);

    if (this.hasCapability('button.restart')) {
      this.registerCapabilityListener('button.restart', async () => {
        this.log('Trying to restart device');
        // The device will not respond to this command, so
        void this.configurationSet({ index: 117, size: 1 }, 1).catch(this.error);
      });
    }

    if (this.hasCapability('button.reset_meter')) {
      this.registerCapabilityListener('button.reset_meter', async () => {
        this.log('Trying to reset meter');
        try {
          await this.meterReset();
        } catch (e) {
          // Homey 13.2 fails by throwing an object...
          if ((e as { Status?: string })?.Status !== 'SUCCESS') {
            throw e;
          }
        }

        // Reset the values as the device does not immediately reports them
        await safeSetCapabilityValue(this, 'meter_power', 0).catch(this.error);
        await safeSetCapabilityValue(this, 'meter_power.import', 0).catch(this.error);
        await safeSetCapabilityValue(this, 'meter_power.export', 0).catch(this.error);
      });
    }

    if (this.hasCapability('button.reset_device')) {
      this.registerCapabilityListener('button.reset_device', async () => {
        this.log('Trying to reset device');
        await this.configurationSet({ index: 120, size: 1 }, 1);
      });
    }

    // Mark as available
    await this.setAvailable();

    this.debug('Configuration completed!');
  }

  /** Use this method to configure the device-specific capabilities */
  protected abstract configureDevice(zwaveNode: ZwaveNode): Promise<void>;

  /** Use this method to configure anything that needs to be configured at first initialization */
  protected async firstInitConfigureDevice(_zwaveNode: ZwaveNode): Promise<void> {
    // To override
  }

  private async configureMaintenanceButtons(): Promise<void> {
    if (this.hasCapability('button.restart')) {
      await this.setCapabilityOptions('button.restart', {
        maintenanceAction: true,
        title: {
          en: 'Reboot device',
          nl: 'Herstart apparaat',
        },
        desc: {
          en: 'Will remotely reboot the device without physical interaction.',
          nl: 'Zal het apparaat zonder fysieke interactie opnieuw opstarten.',
        },
      });
    }

    if (this.hasCapability('button.reset_meter')) {
      await this.setCapabilityOptions('button.reset_meter', {
        maintenanceAction: true,
        title: {
          en: 'Reset power meter',
          nl: 'Stel stroomverbuik opnieuw in',
        },
        desc: {
          en: 'Reset the accumulated power usage (kWh), note that this can not be reversed.',
          nl: 'Stel geaccumuleerde stroomverbruik (kWh) opnieuw in, dit kan niet worden teruggedraaid.',
        },
      });
    }

    if (this.hasCapability('button.reset_device')) {
      await this.setCapabilityOptions('button.reset_device', {
        maintenanceAction: true,
        title: {
          en: 'Reset parameters and leave network',
          nl: 'Reset parameters en netwerk verlaten',
        },
        desc: {
          en: 'Will reset all configuration parameters to factory default settings and device will leave the network.',
          nl: 'Reset alle configuratie parameters naar de fabrieksinstellingen en apparaat verlaat het netwerk.',
        },
      });
    }
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
