import ShellyZwaveDevice from '../../lib/zwave/ZwaveDevice.js';
import { safeAddCapability, safeRemoveCapability } from '../../lib/safeFunctions.js';
import type { ButtonIndicesDeviceInterface, ButtonEventTypesDeviceInterface } from '../../lib/capabilityInterfaces.js';
import type { ButtonEventType } from '../../lib/flow/buttonFlows.js';

export default class ShellyWaveShutterZWaveDevice
  extends ShellyZwaveDevice
  implements ButtonIndicesDeviceInterface, ButtonEventTypesDeviceInterface
{
  public readonly minimumFirmwareVersion = [14, 2] as const;

  private button1Detached = false;
  private button2Detached = false;

  protected async configureDevice(): Promise<void> {
    this.registerCapability('measure_power', 'METER', { multiChannelNodeId: 1 });
    this.registerCapability('meter_power', 'METER', { multiChannelNodeId: 1 });
    this.registerCapability('windowcoverings_set', 'SWITCH_MULTILEVEL', { multiChannelNodeId: 1 });
    this.registerCapability('windowcoverings_tilt_set', 'SWITCH_MULTILEVEL', {
      multiChannelNodeId: 2,
      getOpts: {
        getOnStart: false,
      },
    });
    if (this.hasCapability('windowcoverings_tilt_set')) {
      await this._getCapabilityValue('windowcoverings_tilt_set', 'SWITCH_MULTILEVEL').catch(err =>
        this.error('Error while getting initial windowcoverings_tilt_set value:', err),
      );
    }
    this.registerCapabilityListener('button.calibration', async () => this.startCalibration());

    await this.getConfigurationBulk(7, 2)
      .then(res => {
        this.button1Detached = res[0].readUInt8() === 1;
        this.button2Detached = res[1].readUInt8() === 1;

        if (this.button1Detached || this.button2Detached) {
          safeAddCapability(this, 'hidden.button_pressed');
        } else {
          safeRemoveCapability(this, 'hidden.button_pressed');
        }
      })
      .catch(err => this.error('Error while getting initial setting values:', err));
  }

  public async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: {
    oldSettings: { [p: string]: boolean | string | number | undefined | null };
    newSettings: { [p: string]: boolean | string | number | undefined | null };
    changedKeys: string[];
  }): Promise<string | void> {
    if (changedKeys.includes('zwaveShutterOperatingMode')) {
      // Check for venetian mode
      if (newSettings['zwaveShutterOperatingMode'] === '1') {
        await safeAddCapability(this, 'windowcoverings_tilt_set');
      } else {
        await safeRemoveCapability(this, 'windowcoverings_tilt_set');
      }
    }

    if (changedKeys.includes('zwaveShutterDetachModeSW1') || changedKeys.includes('zwaveShutterDetachModeSW2')) {
      this.button1Detached = newSettings['zwaveShutterDetachModeSW1'] === '1';
      this.button2Detached = newSettings['zwaveShutterDetachModeSW2'] === '1';

      if (this.button1Detached || this.button2Detached) {
        await safeAddCapability(this, 'hidden.button_pressed');
      } else {
        await safeRemoveCapability(this, 'hidden.button_pressed');
      }
    }
    await super.onSettings({ oldSettings, newSettings, changedKeys });
  }

  protected async startCalibration(): Promise<void> {
    this.log('Starting calibration');
    await this.configurationSet(
      {
        index: 78,
        size: 1,
      },
      1,
    );
  }

  public getButtonEventTypes(): ButtonEventType[] {
    return ['single_press', 'long_press', 'hold'];
  }

  public getButtonIndices(): number[] {
    const buttons = [];
    if (this.button1Detached) {
      buttons.push(0);
    }
    if (this.button2Detached) {
      buttons.push(1);
    }
    return buttons;
  }
}
