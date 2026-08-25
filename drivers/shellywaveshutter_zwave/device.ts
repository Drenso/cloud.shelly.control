import ShellyZwaveDevice from '../../lib/zwave/ZwaveDevice.js';
import { safeAddCapability, safeRemoveCapability } from '../../lib/safeFunctions.js';

export default class ShellyWaveShutterZWaveDevice extends ShellyZwaveDevice {
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
}
