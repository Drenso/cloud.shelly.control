import Homey, { type ZwaveNode } from 'homey';
import { ZwaveDevice } from 'homey-zwavedriver';
import { type QueuedWorker, queueWorker } from '../global-promise-queue.js';
import Logger from '../log/Logger.js';
import { safeSetCapabilityValue } from '../safeFunctions.js';
import { type ButtonEventType, safeTriggerButtonPressed, safeTriggerSingleButtonPressed } from '../flow/buttonFlows.js';

const enum KeyAttributes {
  Pressed = 'Key Pressed 1 time',
  Released = 'Key Released',
  Held = 'Key Held Down',
  Pressed2 = 'Key Pressed 2 times',
  Pressed3 = 'Key Pressed 3 times',
  Pressed4 = 'Key Pressed 4 times',
  Pressed5 = 'Key Pressed 5 times',
}

type CentralSceneNotification = {
  'Sequence Number (Raw)': Buffer;
  'Sequence Number': number;
  'Properties1 (Raw)': Buffer;
  Properties1: { 'Slow Refresh': boolean; 'Key Attributes': KeyAttributes };
  'Scene Number (Raw)': Buffer;
  'Scene Number': number;
};

export default abstract class ShellyZwaveDevice extends ZwaveDevice {
  protected logger?: Logger = undefined;
  private queuedWorker?: QueuedWorker;

  public readonly minimumFirmwareVersion: readonly [number, number] = [0, 0];
  protected readonly calibrationStartConfigurationIndex = 78;

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

    if (this.node.CommandClass['CENTRAL_SCENE'] !== undefined) {
      this.registerReportListener(
        'CENTRAL_SCENE',
        'CENTRAL_SCENE_NOTIFICATION',
        (payload: CentralSceneNotification) => {
          this.debug(payload['Scene Number'], payload.Properties1['Key Attributes']);
          const buttonEvent = this.convertButtonPress(payload.Properties1['Key Attributes']);

          if (buttonEvent === null) {
            this.error('Unsupported Z-Wave key event:', payload.Properties1['Key Attributes']);
            return;
          }

          if (this.hasCapability('hidden.single_button_pressed')) {
            safeTriggerSingleButtonPressed(this, buttonEvent);
          }
          if (this.hasCapability('hidden.button_pressed')) {
            safeTriggerButtonPressed(this, payload['Scene Number'] - 1, buttonEvent);
          }
        },
      );
    }

    const [major, minor] = await this.getFirmwareVersion();
    const [minimumMajor, minimumMinor] = this.minimumFirmwareVersion;
    if (major < minimumMajor || (major === minimumMajor && minor < minimumMinor)) {
      this.log('Firmware outdated!');
      await this.setUnavailable(
        this.homey.__('device.firmware_too_old', { version: `${minimumMajor}.${minimumMinor}` }),
      ).catch(err => this.error('Error while setting device to unavailable due to outdated firmware:', err));
    } else {
      await this.setAvailable().catch(err =>
        this.error('Error while setting device to available at end of configuration:', err),
      );
    }

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

  private convertButtonPress(type: KeyAttributes): ButtonEventType | null {
    switch (type) {
      case KeyAttributes.Pressed:
        return 'single_press';
      case KeyAttributes.Held:
        return 'hold';
      case KeyAttributes.Released:
        return 'long_press';
      case KeyAttributes.Pressed2:
        return 'double_press';
      case KeyAttributes.Pressed3:
        return 'triple_press';
      default:
        return null;
    }
  }

  public async getFirmwareVersion(): Promise<[number, number]> {
    // @ts-expect-error VERSION_GET is defined at runtime
    const response = (await this.node.CommandClass.COMMAND_CLASS_VERSION.VERSION_GET()) as {
      'Firmware 0 Version': number;
      'Firmware 0 Sub Version': number;
    };

    return [response['Firmware 0 Version'], response['Firmware 0 Sub Version']];
  }

  public async getConfigurationBulk(startIndex: number, count: number): Promise<Buffer[]> {
    const response = await (
      this.node.CommandClass['COMMAND_CLASS_CONFIGURATION'] as unknown as {
        CONFIGURATION_BULK_GET: (args: {
          'Parameter Offset': number;
          'Number of Parameters': number;
        }) => Promise<{ vg: { Parameter: Buffer }[] }>;
      }
    ).CONFIGURATION_BULK_GET({
      'Parameter Offset': startIndex,
      'Number of Parameters': count,
    });
    return response.vg.map(res => res.Parameter);
  }

  protected async startCalibration(): Promise<void> {
    this.log('Starting calibration');
    await this.configurationSet(
      {
        index: this.calibrationStartConfigurationIndex,
        size: 1,
      },
      1,
    );
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
